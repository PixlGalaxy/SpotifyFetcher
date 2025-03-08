const BACKEND_URL = 'http://localhost:4000';

const getSpotifyToken = async (): Promise<string> => {
  try {
    const response = await fetch(`${BACKEND_URL}/get_spotify_token`);
    if (!response.ok) throw new Error("Could not retrieve token");

    const data = await response.json();
    if (!data.accessToken) throw new Error("Empty token");

    return `Bearer ${data.accessToken}`;
  } catch (error) {
    console.error('Error retrieving Spotify token:', error);
    throw error;
  }
};

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

interface Song {
  name: string;
  artist: string;
  url: string;
}

const fetchSpotifyPlaylist = async (playlistId: string): Promise<Song[]> => {
  try {
    const token = await getSpotifyToken();
    const response = await fetch(`${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`, {
      headers: { Authorization: token },
    });

    const data = await response.json();
    return data.items.map((item: any) => ({
      name: item.track.name,
      artist: item.track.artists.map((a: any) => a.name).join(", "),
      url: item.track.external_urls.spotify,
    }));
  } catch (error) {
    console.error('Error retrieving Spotify playlist:', error);
    return [];
  }
};

const fetchSpotifyTrack = async (trackId: string): Promise<Song | null> => {
  try {
    const token = await getSpotifyToken();
    const response = await fetch(`${SPOTIFY_API_URL}/tracks/${trackId}`, {
      headers: { Authorization: token },
    });

    const data = await response.json();
    return {
      name: data.name,
      artist: data.artists.map((a: any) => a.name).join(", "),
      url: data.external_urls.spotify,
    };
  } catch (error) {
    console.error('Error retrieving Spotify track:', error);
    return null;
  }
};

export { fetchSpotifyPlaylist, fetchSpotifyTrack };
