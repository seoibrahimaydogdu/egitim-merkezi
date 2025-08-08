import React, { useState } from "react";
import VideoList from "./components/VideoList";

const VideoSearch: React.FC = () => {
  const [query, setQuery] = useState("seo");
  const [language, setLanguage] = useState("tr");
  const [order, setOrder] = useState<"relevance" | "date" | "viewCount">("relevance");
  const [input, setInput] = useState("seo");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(input.trim());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-6 items-center">
        <input
          type="text"
          placeholder="Anahtar kelime..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="tr">Türkçe</option>
          <option value="en">İngilizce</option>
        </select>

        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="relevance">Alaka (varsayılan)</option>
          <option value="date">En yeni</option>
          <option value="viewCount">En çok izlenen</option>
        </select>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Ara
        </button>
      </form>

      <VideoList query={query} language={language} order={order} />
    </div>
  );
};

export default VideoSearch;
