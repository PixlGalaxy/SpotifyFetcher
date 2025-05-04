const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { https } = require('follow-redirects');
const extract = require('extract-zip');

const app = express();
const PORT = process.env.PORT || 4000;

const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

const FFMPEG_DIR = path.join(__dirname, 'ffmpeg');
const FFMPEG_PATH = isWindows ? path.join(FFMPEG_DIR, 'ffmpeg.exe') : path.join(FFMPEG_DIR, 'ffmpeg');

const YTDLP_PATH = isWindows ? "yt-dlp.exe" : "yt-dlp";
const YTDLP_URL = isWindows
  ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
  : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

const FFMPEG_URL = isWindows
  ? "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
  : "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz";

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const downloadFFmpeg = async () => {
  if (fs.existsSync(FFMPEG_PATH)) {
    console.log("[Backend] FFmpeg is already installed.");
    return;
  }

  console.log("[Backend] Downloading FFmpeg...");

  const TEMP_DIR = path.join(__dirname, 'ffmpeg_download');
  const ZIP_PATH = TEMP_DIR + (isWindows ? ".zip" : ".tar.xz");

  return new Promise((resolve, reject) => {
    https.get(FFMPEG_URL, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return https.get(response.headers.location, res => res.pipe(fs.createWriteStream(ZIP_PATH)).on('finish', () => resolve()));
      }

      if (response.statusCode !== 200) {
        reject(`Error downloading FFmpeg: ${response.statusCode}`);
        return;
      }

      const file = fs.createWriteStream(ZIP_PATH);
      response.pipe(file);

      file.on('finish', async () => {
        file.close();
        console.log("[Backend] FFmpeg download complete.");

        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

        if (isWindows) {
          await extract(ZIP_PATH, { dir: TEMP_DIR });
          console.log("[Backend] FFmpeg extracted successfully.");

          const extractedFolders = fs.readdirSync(TEMP_DIR);
          const ffmpegFolder = extractedFolders.find(folder => folder.includes("ffmpeg"));
          if (!ffmpegFolder) return reject("FFmpeg folder not found.");

          const extractedPath = path.join(TEMP_DIR, ffmpegFolder, "bin", "ffmpeg.exe");
          if (!fs.existsSync(extractedPath)) return reject("ffmpeg.exe not found.");

          if (!fs.existsSync(FFMPEG_DIR)) fs.mkdirSync(FFMPEG_DIR);

          fs.renameSync(extractedPath, FFMPEG_PATH);
          console.log("[Backend] FFmpeg installed at:", FFMPEG_PATH);
        } else {
          exec(`tar -xf ${ZIP_PATH} -C ${TEMP_DIR}`, (err) => {
            if (err) return reject("Error extracting FFmpeg on Linux.");

            const extractedFolders = fs.readdirSync(TEMP_DIR);
            const ffmpegFolder = extractedFolders.find(folder => folder.includes("ffmpeg"));
            if (!ffmpegFolder) return reject("FFmpeg folder not found.");

            const extractedPath = path.join(TEMP_DIR, ffmpegFolder, "ffmpeg");
            if (!fs.existsSync(extractedPath)) return reject("FFmpeg binary not found.");

            if (!fs.existsSync(FFMPEG_DIR)) fs.mkdirSync(FFMPEG_DIR);

            fs.renameSync(extractedPath, FFMPEG_PATH);
            fs.chmodSync(FFMPEG_PATH, 0o755);
            console.log("[Backend] FFmpeg installed at:", FFMPEG_PATH);
          });
        }

        fs.unlinkSync(ZIP_PATH);
        resolve();
      });

      file.on('error', (err) => reject(`Error writing file: ${err}`));
    }).on('error', (err) => reject(`Error in download request: ${err}`));
  });
};

const installYT_DLP = async () => {
  try {
    execSync(`${YTDLP_PATH} --version`, { stdio: 'ignore' });
    console.log("[Backend] yt-dlp is already installed.");
  } catch (error) {
    console.log("[Backend] yt-dlp not found. Downloading...");

    const filePath = path.join(__dirname, YTDLP_PATH);

    return new Promise((resolve, reject) => {
      https.get(YTDLP_URL, (response) => {
        if (response.statusCode !== 200) {
          reject(`Error downloading yt-dlp: ${response.statusCode}`);
          return;
        }

        const file = fs.createWriteStream(filePath);
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          if (!isWindows) fs.chmodSync(filePath, 0o755);
          console.log("[Backend] yt-dlp installed successfully.");
          resolve();
        });

        file.on('error', (err) => reject(`Error writing yt-dlp file: ${err}`));
      }).on('error', (err) => reject(`Error downloading yt-dlp: ${err}`));
    });
  }
};

const fetch = require('node-fetch');

const CLIENT_ID = 'TU_CLIENT_ID';
const CLIENT_SECRET = 'TU_CLIENT_SECRET';

app.get('/get_spotify_token', async (req, res) => {
  try {
    console.log("[Backend] Getting Spotify token from Developer API...");

    const authBuffer = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authBuffer}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' })
    });

    if (!response.ok) {
      console.error("[Backend] Spotify auth error:", response.statusText);
      return res.status(response.status).json({ error: 'Spotify token request failed' });
    }

    const data = await response.json();
    console.log("[Backend] Token received successfully.");
    res.json({ accessToken: data.access_token, expiresIn: data.expires_in });

  } catch (error) {
    console.error("[Backend] Error getting Spotify token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/download_song', async (req, res) => {
  const { query } = req.body;
  console.log(`[Backend] Received download request for: ${query}`);

  if (!query) {
    console.error("[Backend] Error: Missing query parameter");
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    console.log(`[Backend] Searching YouTube: ${query}`);

    exec(`yt-dlp --default-search "ytsearch" --get-id --no-warnings "${query}"`, (error, stdout) => {
      if (error) {
        console.error("[Backend] Error searching YouTube:", error);
        return res.status(500).json({ error: 'Error searching for the song on YouTube' });
      }

      const videoId = stdout.trim().split('\n')[0];
      if (!videoId) {
        console.error("[Backend] No video found.");
        return res.status(404).json({ error: 'Video not found' });
      }

      const outputPath = path.join(DOWNLOAD_DIR, `${videoId}.mp3`);
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      console.log(`[Backend] Video found: ${youtubeUrl}`);
      console.log("[Backend] Downloading audio...");

      const ffmpegLocation = `"${FFMPEG_PATH}"`;
      exec(`yt-dlp -x --audio-format mp3 --ffmpeg-location ${ffmpegLocation} -o "${outputPath}" "${youtubeUrl}"`, (err) => {
        if (err) {
          console.error("[Backend] Error downloading audio:", err);
          return res.status(500).json({ error: 'Error downloading audio' });
        }

        console.log("[Backend] Download complete:", outputPath);
        res.download(outputPath);
      });
    });
  } catch (error) {
    console.error("[Backend] Backend error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

downloadFFmpeg(), installYT_DLP()
  .then(() => {
    app.listen(PORT, () => console.log(`[Backend] Server running at http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error("[Backend] Error downloading FFmpeg:", error);
  });
