// scripts/ensure-ytdlp.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.join(process.cwd(), 'bin');
const ytDlpPath = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

function hasSystemYtDlp() {
  try {
    execSync('yt-dlp --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

async function main() {
  if (fs.existsSync(ytDlpPath)) {
    console.log(`[yt-dlp setup] Bundled yt-dlp already present at: ${ytDlpPath}`);
    return;
  }

  if (hasSystemYtDlp()) {
    console.log('[yt-dlp setup] yt-dlp is available in system PATH.');
    return;
  }

  console.log('[yt-dlp setup] Downloading standalone yt-dlp binary for environment...');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  let downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  if (process.platform === 'win32') {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  } else if (process.platform === 'darwin') {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  }

  try {
    await downloadFile(downloadUrl, ytDlpPath);
    if (process.platform !== 'win32') {
      fs.chmodSync(ytDlpPath, 0o755);
    }
    console.log(`[yt-dlp setup] Successfully downloaded and set executable permissions at: ${ytDlpPath}`);
  } catch (err) {
    console.warn(`[yt-dlp setup] Warning: Failed to auto-download yt-dlp: ${err.message}`);
  }
}

main().catch((err) => {
  console.warn('[yt-dlp setup] Setup script finished with warning:', err.message);
});
