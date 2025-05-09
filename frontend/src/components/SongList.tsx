import { useState } from 'react';

interface Song {
  name: string;
  artist: string;
  url: string;
}

interface SongListProps {
  songs: Song[];
}

const BACKEND_URL = 'http://localhost:4000';

const SongList = ({ songs }: SongListProps) => {
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>({});
  const [progress, setProgress] = useState(0);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const searchYouTubeAndDownload = async (song: Song) => {
    setDownloading((prev) => ({ ...prev, [song.name]: true }));

    try {
      const response = await fetch(`${BACKEND_URL}/download_song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${song.name} ${song.artist} audio` }),
      });

      if (!response.ok) {
        throw new Error(`Error searching on YouTube. HTTP Code: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("An error occurred while searching for the song.");
    }

    setDownloading((prev) => ({ ...prev, [song.name]: false }));
  };

  const downloadAllSongs = async () => {
    setDownloadingAll(true);
    setProgress(0);

    for (let i = 0; i < songs.length; i++) {
      await searchYouTubeAndDownload(songs[i]);
      setProgress(((i + 1) / songs.length) * 100);
    }

    setDownloadingAll(false);
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-center mb-4">Songs</h2>
      <div className="flex justify-center mb-4">
        <button
          onClick={downloadAllSongs}
          className={`px-4 py-2 rounded-md text-white ${
            downloadingAll ? "bg-gray-500 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
          disabled={downloadingAll}
        >
          {downloadingAll ? "Downloading All..." : "Download All"}
        </button>
      </div>
      {downloadingAll && (
        <div className="w-full bg-gray-300 rounded-md overflow-hidden mb-4">
          <div
            className="bg-blue-500 h-4 rounded-md"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      <ul className="space-y-4">
        {songs.map((song, index) => (
          <li key={index} className="flex justify-between items-center bg-gray-100 p-4 rounded-md">
            <div>
              <p className="font-medium">{song.name}</p>
              <p className="text-sm text-gray-500">{song.artist}</p>
            </div>
            <button
              onClick={() => searchYouTubeAndDownload(song)}
              className={`px-3 py-1 rounded-md text-white ${
                downloading[song.name] ? "bg-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
              }`}
              disabled={downloading[song.name]}
            >
              {downloading[song.name] ? "Downloading..." : "Download"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SongList;
