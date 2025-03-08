import { useState } from "react";
import { fetchSpotifyPlaylist, fetchSpotifyTrack } from "./services/spotifyService";
import SongList from "./components/SongList";
import InputForm from "./components/InputForm";

interface Song {
  name: string;
  artist: string;
  url: string;
}

const spotifyRegex = /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(?<type>track|playlist)[/:](?<id>[\dA-Za-z]+)/u;

function App() {
  const [songs, setSongs] = useState<Song[]>([]);

  const handleFetchSongs = async (url: string) => {
    console.log("Received URL:", url);

    const match = spotifyRegex.exec(url);
    if (!match || !match.groups) {
      alert("Invalid Spotify URL.");
      return;
    }

    const { type, id } = match.groups;
    let fetchedSongs: Song[] = [];

    if (type === "playlist") {
      console.log("Detected: Playlist, ID:", id);
      fetchedSongs = await fetchSpotifyPlaylist(id);
    } else if (type === "track") {
      console.log("Detected: Track, ID:", id);
      fetchedSongs = await fetchSpotifyTrack(id);
    }

    console.log("Retrieved songs:", fetchedSongs);
    setSongs(fetchedSongs);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6">Spotify Fetcher</h1>
      <InputForm onSubmit={handleFetchSongs} />
      <SongList songs={songs} />
    </div>
  );
}

export default App;
