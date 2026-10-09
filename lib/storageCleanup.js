// lib/storageCleanup.js
import fs from 'fs';
import path from 'path';
import Clip from '../models/Clip.js';

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

    // 1. Gather all potential file targets
    const targetPaths = new Set([
      path.join(outputsDir, `${id}.mp4`),
      path.join(outputsDir, `${id}-vertical.mp4`),
      path.join(outputsDir, `${id}-horizontal.mp4`),
      path.join(outputsDir, `${id}-preview.mp4`),
      path.join(tempDir, `${id}-raw.mp4`),
      path.join(tempDir, `${id}.ass`),
    ]);

    if (clipDoc) {
      if (clipDoc.videoPath) targetPaths.add(path.join(process.cwd(), 'public', clipDoc.videoPath));
      if (clipDoc.videoPathVertical) targetPaths.add(path.join(process.cwd(), 'public', clipDoc.videoPathVertical));
      if (clipDoc.videoPathHorizontal) targetPaths.add(path.join(process.cwd(), 'public', clipDoc.videoPathHorizontal));
    }

    // Also scan outputsDir for any wildcard files starting with clipId (like .part files)
    if (fs.existsSync(outputsDir)) {
      try {
        const outputFiles = fs.readdirSync(outputsDir);
        for (const file of outputFiles) {
          if (file.startsWith(id)) {
            targetPaths.add(path.join(outputsDir, file));
          }
        }
      } catch (scanErr) {
        // ignore scan errors
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
      const clip = await Clip.findById(id);
      if (clip && clip.status === 'completed') {
        const renderTime = clip.renderedAt ? new Date(clip.renderedAt).getTime() : 0;
        const elapsed = Date.now() - renderTime;

        // Ensure at least 10 minutes elapsed before deleting
        if (elapsed >= STORAGE_RETENTION_MS - 2000) {
          console.log(`STORAGE CLEANUP: 10 minutes elapsed for clip ${id}. Purging files to free up server disk space...`);
          await deleteClipVideoFiles(id, clip, 'expired_10min');
        }
      }
    } catch (err) {
      console.error(`STORAGE CLEANUP: Timer error for clip ${id}:`, err);
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
 * as well as orphan/temporary files in public/outputs.
 */
export async function cleanupExpiredClips() {
  try {
    const outputsDir = path.join(process.cwd(), 'public', 'outputs');
    const cutoffTime = new Date(Date.now() - STORAGE_RETENTION_MS);

    // 1. Find all completed clips whose renderedAt was over 10 minutes ago
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

    // 2. Also check completed clips where the physical file is already missing on disk
    const otherCompleted = await Clip.find({ status: 'completed' });
    for (const clip of otherCompleted) {
      const relPath = clip.videoPathVertical || clip.videoPath;
      if (relPath) {
        const absPath = path.join(process.cwd(), 'public', relPath);
        if (!fs.existsSync(absPath)) {
          // File was already removed, update DB to pending
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

    // 3. Scan outputsDir for stray/orphan .part and .mp4 files older than 10 minutes
    if (fs.existsSync(outputsDir)) {
      try {
        const files = fs.readdirSync(outputsDir);
        const now = Date.now();
        for (const file of files) {
          if (file === '.gitkeep') continue;
          const fullPath = path.join(outputsDir, file);
          try {
            const stat = fs.statSync(fullPath);
            const ageMs = now - stat.mtimeMs;
            // If file is older than 10 minutes or is a leftover .part file
            if (file.endsWith('.part') || (ageMs > STORAGE_RETENTION_MS && file.endsWith('.mp4'))) {
              // Check if any clip was rendered recently with this filename
              const clipIdMatch = file.match(/^([a-f0-9]{24})/);
              if (clipIdMatch) {
                const clipId = clipIdMatch[1];
                const activeClip = await Clip.findById(clipId);
                if (activeClip && activeClip.status === 'completed' && activeClip.renderedAt) {
                  const clipAge = now - new Date(activeClip.renderedAt).getTime();
                  if (clipAge < STORAGE_RETENTION_MS) {
                    continue; // Still within valid 10-minute window
                  }
                }
              }
              fs.unlinkSync(fullPath);
              console.log(`STORAGE CLEANUP: Deleted stale output file ${file} (age: ${Math.round(ageMs / 1000)}s).`);
            }
          } catch (e) {
            // ignore individual file errors
          }
        }
      } catch (e) {
        // ignore readdir errors
      }
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
