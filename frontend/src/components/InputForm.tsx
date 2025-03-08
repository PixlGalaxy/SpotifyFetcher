import { useState } from "react";

interface InputFormProps {
  onSubmit: (url: string) => void;
}

const InputForm = ({ onSubmit }: InputFormProps) => {
  const [url, setUrl] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert("Please enter a valid Spotify URL.");
      return;
    }
    onSubmit(url);
    setUrl("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
      <input
        type="text"
        value={url}
        onChange={handleChange}
        placeholder="Enter Spotify URL (Track or Playlist)"
        className="p-2 border border-gray-300 rounded-md w-80"
      />
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
        Search
      </button>
    </form>
  );
};

export default InputForm;
