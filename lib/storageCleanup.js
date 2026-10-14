// lib/storageCleanup.js
import fs from 'fs';
import path from 'path';
import Clip from '../models/Clip.js';
import dbConnect from './db.js';

// Retention duration: 10 minutes (in milliseconds)
export const STORAGE_RETENTION_MS = 10 * 60 * 1000;

// In-memory active cleanup timers mapped by clipId
const activeTimers = new Map();

/**
 * Deletes all physical video files, previews, and temporary files for a given clip from disk,
 * and updates the Clip model in the database to reflect that the video was purged to save storage.
 */
export async function deleteClipVideoFiles(clipId, clipDoc = null, reason = 'manual') {
  if (!clipId) return null;

  try {
    const id = clipId.toString();
    const outputsDir = path.join(process.cwd(), 'public', 'outputs');
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const rootTempDir = path.join(process.cwd(), 'temp');

    // 1. Gather all potential file targets
    const targetPaths = new Set([
      path.join(outputsDir, `${id}.mp4`),
      path.join(outputsDir, `${id}-vertical.mp4`),
      path.join(outputsDir, `${id}-horizontal.mp4`),
      path.join(outputsDir, `${id}-preview.mp4`),
      path.join(tempDir, `temp-${id}.mp4`),
      path.join(tempDir, `temp-${id}.mp4.part`),
      path.join(tempDir, `temp-${id}.mp4.ytdl`),
      path.join(tempDir, `sub-${id}.ass`),
      path.join(tempDir, `${id}-raw.mp4`),
      path.join(tempDir, `${id}.ass`),
    ]);

    if (clipDoc) {
      if (clipDoc.videoPath) targetPaths.add(path.join(process.cwd(), 'public', clipDoc.videoPath));
      if (clipDoc.videoPathVertical) targetPaths.add(path.join(process.cwd(), 'public', clipDoc.videoPathVertical));
      if (clipDoc.videoPathHorizontal) targetPaths.add(path.join(process.cwd(), 'public', clipDoc.videoPathHorizontal));
    }

    // Also scan all temp & outputs directories for any file containing clipId
    for (const dir of [outputsDir, tempDir, rootTempDir]) {
      if (fs.existsSync(/*turbopackIgnore: true*/ dir)) {
        try {
          const dirFiles = fs.readdirSync(/*turbopackIgnore: true*/ dir);
          for (const file of dirFiles) {
            if (file.includes(id)) {
              targetPaths.add(path.join(dir, file));
            }
          }
        } catch (_) {}
      }
    }

    // 2. Unlink every existing target file
    let deletedCount = 0;
    for (const filePath of targetPaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (unlinkErr) {
        console.warn(`STORAGE CLEANUP: Failed to unlink ${filePath}:`, unlinkErr.message);
      }
    }

    // Clear any pending in-memory timer
    if (activeTimers.has(id)) {
      clearTimeout(activeTimers.get(id));
      activeTimers.delete(id);
    }

    // 3. Update Clip document in MongoDB
    try {
      await dbConnect();
      let clip = clipDoc;
      if (!clip) {
        clip = await Clip.findById(id);
      }

      if (clip) {
        clip.status = 'pending';
        clip.videoPath = null;
        clip.videoPathVertical = null;
        clip.videoPathHorizontal = null;
        clip.renderedAt = null;
        clip.purgedAt = new Date();
        clip.purgedReason = reason;
        await clip.save();
      }
      console.log(`STORAGE CLEANUP: Deleted ${deletedCount} files for clip ${id} (reason: ${reason}).`);
      return clip;
    } catch (dbErr) {
      console.warn(`STORAGE CLEANUP: Files deleted (${deletedCount}), but DB update skipped:`, dbErr.message);
      return null;
    }
  } catch (err) {
    console.error(`STORAGE CLEANUP: Error deleting clip ${clipId} files:`, err);
    return null;
  }
}

/**
 * Schedules an automated timer to delete the rendered video files exactly after 10 minutes.
 */
export function scheduleClipAutoCleanup(clipId, delayMs = STORAGE_RETENTION_MS) {
  if (!clipId) return;
  const id = clipId.toString();

  // Cancel any existing timer for this clip
  if (activeTimers.has(id)) {
    clearTimeout(activeTimers.get(id));
    activeTimers.delete(id);
  }

  const timer = setTimeout(async () => {
    try {
      activeTimers.delete(id);
      await dbConnect();
      const clip = await Clip.findById(id);
      if (clip && clip.status === 'completed') {
        const renderTime = clip.renderedAt ? new Date(clip.renderedAt).getTime() : 0;
        const elapsed = Date.now() - renderTime;

        // Ensure at least 10 minutes elapsed before deleting
        if (elapsed >= STORAGE_RETENTION_MS - 2000) {
          console.log(`STORAGE CLEANUP: 10 minutes elapsed for clip ${id}. Purging files to free up server disk space...`);
          await deleteClipVideoFiles(id, clip, 'expired_10min');
        }
      } else if (clip) {
        // If it was preview-only or pending for over 10 min, also purge preview files
        await deleteClipVideoFiles(id, clip, 'expired_preview');
      } else {
        // Fallback: delete files even if clip document was removed
        await deleteClipVideoFiles(id, null, 'expired_fallback');
      }
    } catch (err) {
      console.error(`STORAGE CLEANUP: Timer error for clip ${id}:`, err);
      // Even on DB error, force purge physical files directly
      await deleteClipVideoFiles(id, null, 'expired_emergency');
    }
  }, delayMs);

  // Prevent timer from blocking process exit
  if (timer.unref) {
    timer.unref();
  }

  activeTimers.set(id, timer);
  console.log(`STORAGE CLEANUP: Scheduled 10-minute auto-deletion for clip ${id} in ${Math.round(delayMs / 1000)}s.`);
}

/**
 * Periodic or on-demand sweeper that deletes any rendered video older than 10 minutes,
 * as well as orphan/temporary files in public/outputs and public/temp.
 */
export async function cleanupExpiredClips() {
  try {
    const outputsDir = path.join(process.cwd(), 'public', 'outputs');
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const rootTempDir = path.join(process.cwd(), 'temp');
    const now = Date.now();
    const cutoffTime = new Date(now - STORAGE_RETENTION_MS);

    // 1. Try DB-level sync if database is reachable
    try {
      await dbConnect();
      const expiredClips = await Clip.find({
        status: 'completed',
        $or: [
          { renderedAt: { $lte: cutoffTime } },
          { renderedAt: null, createdAt: { $lte: cutoffTime } },
        ],
      });

      for (const clip of expiredClips) {
        await deleteClipVideoFiles(clip._id, clip, 'expired_10min');
      }

      // Check completed clips where physical file is missing
      const otherCompleted = await Clip.find({ status: 'completed' });
      for (const clip of otherCompleted) {
        const relPath = clip.videoPathVertical || clip.videoPath;
        if (relPath) {
          const absPath = path.join(process.cwd(), 'public', relPath);
          if (!fs.existsSync(absPath)) {
            clip.status = 'pending';
            clip.videoPath = null;
            clip.videoPathVertical = null;
            clip.videoPathHorizontal = null;
            clip.renderedAt = null;
            clip.purgedAt = clip.purgedAt || new Date();
            clip.purgedReason = clip.purgedReason || 'expired_10min';
            await clip.save();
          }
        }
      }
    } catch (dbErr) {
      console.warn('STORAGE CLEANUP: Database unreachable during sweep, continuing with filesystem sweep:', dbErr.message);
    }

    // 2. Strict Filesystem-Level Age Sweep across outputs and temp dirs
    // This guarantees disk space is ALWAYS recovered even if PM2 restarted or DB had issues
    const targetDirs = [outputsDir, tempDir, rootTempDir];

    for (const dir of targetDirs) {
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) continue;

      try {
        const files = fs.readdirSync(/*turbopackIgnore: true*/ dir);
        for (const file of files) {
          if (file === '.gitkeep') continue;
          const fullPath = path.join(dir, file);

          try {
            const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath);
            const ageMs = now - stat.mtimeMs;

            // Immediately purge broken .part and .ytdl files older than 2 minutes
            const isPartial = file.endsWith('.part') || file.endsWith('.ytdl');
            if (isPartial && ageMs > 2 * 60 * 1000) {
              fs.unlinkSync(fullPath);
              console.log(`STORAGE CLEANUP: Deleted stale partial file ${file} in ${path.basename(dir)} (age: ${Math.round(ageMs / 1000)}s).`);
              continue;
            }

            // Purge temporary subtitle ASS files older than 5 minutes
            if (file.endsWith('.ass') && ageMs > 5 * 60 * 1000) {
              fs.unlinkSync(fullPath);
              console.log(`STORAGE CLEANUP: Deleted temporary ASS file ${file} in ${path.basename(dir)}.`);
              continue;
            }

            // Purge any video file older than 10 minutes (600 seconds)
            const isVideo = file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv');
            if (isVideo && ageMs > STORAGE_RETENTION_MS) {
              fs.unlinkSync(fullPath);
              console.log(`STORAGE CLEANUP: Deleted expired video file ${file} in ${path.basename(dir)} (age: ${Math.round(ageMs / 1000)}s).`);
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error('STORAGE CLEANUP: Error running cleanup sweep:', err);
  }
}

// Ensure global singleton interval runs every 60 seconds
if (typeof global !== 'undefined') {
  if (!global.__shortsCleanupInterval) {
    global.__shortsCleanupInterval = setInterval(() => {
      cleanupExpiredClips().catch(() => {});
    }, 60 * 1000);
    if (global.__shortsCleanupInterval.unref) {
      global.__shortsCleanupInterval.unref();
    }
  }
}
