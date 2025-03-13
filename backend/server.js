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

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/get_spotify_token', async (req, res) => {
  try {
    console.log("[Backend] Attempting to get Spotify token...");

    const response = await fetch('https://open.spotify.com/get_access_token', {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      console.error("[Backend] Request error:", response.status);
      return res.status(response.status).json({ error: `Spotify API error: ${response.status}` });
    }

    const data = await response.json();
    if (!data.accessToken) {
      console.error("[Backend] Failed to retrieve Spotify token.");
      return res.status(500).json({ error: "Could not retrieve token" });
    }

    console.log("[Backend] Spotify token retrieved successfully.");
    res.json({ accessToken: data.accessToken });

  } catch (error) {
    console.error("[Backend] Error retrieving Spotify token:", error);
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

app.post('/download_all', async (req, res) => {
    const { songs } = req.body;
    if (!Array.isArray(songs) || songs.length === 0) return res.status(400).json({ error: 'Invalid song list' });

    let downloadedFiles = [];
    let errors = [];

    for (const song of songs) {
        const query = `${song.name} ${song.artist} audio`;

        try {
            const videoId = await new Promise((resolve, reject) => {
                exec(`yt-dlp --default-search "ytsearch" --get-id --no-warnings "${query}"`, (error, stdout) => {
                    if (error) return reject('Error searching YouTube');
                    const id = stdout.trim().split('\n')[0];
                    if (!id) return reject('Video not found');
                    resolve(id);
                });
            });

            const outputPath = path.join(DOWNLOAD_DIR, `${videoId}.mp3`);
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

            await new Promise((resolve, reject) => {
                exec(`yt-dlp -x --audio-format mp3 --ffmpeg-location "${FFMPEG_PATH}" -o "${outputPath}" "${youtubeUrl}"`, (err) => {
                    if (err) return reject('Error downloading audio');
                    downloadedFiles.push(outputPath);
                    resolve();
                });
            });

        } catch (error) {
            errors.push({ song, error });
        }
    }

    res.json({ downloadedFiles, errors });
});

app.listen(PORT, () => console.log(`[Backend] Server running at http://localhost:${PORT}`));
