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

  const searchYouTubeAndDownload = async (song: Song) => {
    setDownloading((prev) => ({ ...prev, [song.name]: true }));

    try {
      console.log(`Searching YouTube: ${song.name} - ${song.artist}`);

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

      console.log(`Download complete: ${song.name}.mp3`);
    } catch (error) {
      console.error("Error searching the song on YouTube:", error);
      alert("An error occurred while searching for the song.");
    }

    setDownloading((prev) => ({ ...prev, [song.name]: false }));
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-center mb-4">Songs</h2>
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
