import React, { useEffect, useMemo, useState } from "react";
import VideoList from "./components/VideoList";

type Video = {
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  published_at: string;
  channel_title: string;
  channel_thumbnail?: string;
  channel_id: string;
  duration?: string;
  chapters?: { start_seconds: number; title: string }[];
};

export default function VideoSearch() {
  const [input, setInput] = useState("seo");
  const [query, setQuery] = useState("seo");
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const [order, setOrder] = useState<"relevance" | "date" | "viewCount">("relevance");

  // fresh-first state
  const [fresh, setFresh] = useState<Video[]>([]);
  const [cached, setCached] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string>("");

  const base = `http://localhost:8000/videos?query=${encodeURIComponent(
    query
  )}&language=${language}&order=${order}&max_results=12`;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || q === query) return;
    setQuery(q);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // uniq merge (fresh önce)
  const mergeVideos = (a: Video[], b: Video[]) => {
    const seen = new Set<string>();
    const out: Video[] = [];
    for (const v of [...a, ...b]) {
      if (!v?.video_id) continue;
      if (seen.has(v.video_id)) continue;
      seen.add(v.video_id);
      out.push(v);
    }
    return out;
  };

  // ilk yükleme / her aramada: fresh + cache birlikte
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setFresh([]);
    setCached([]);

    const pFresh = fetch(`${base}&fresh=true`)
      .then((r) => r.json())
      .catch(() => ({ items: [] as Video[] }));

    const pCache = fetch(base)
      .then((r) => r.json())
      .catch(() => ({ items: [] as Video[] }));

    Promise.all([pFresh, pCache])
      .then(([f, c]) => {
        if (!alive) return;
        setFresh((f?.items as Video[]) || []);
        setCached((c?.items as Video[]) || []);
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .catch(() => alive && setError("Bir şeyler ters gitti, tekrar dener misin?"))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, language, order]);

  // buton: sadece fresh çek; ekrana ve cache'e yaz
  const refreshFreshOnly = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${base}&fresh=true`);
      const data = await res.json();
      const newFresh = (data?.items as Video[]) || [];
      setFresh(newFresh);          // ekrana yaz
      setCached(newFresh);         // cache görünümünü de eşitle (backend zaten DB cache'liyor)
      setLastUpdated(new Date().toLocaleTimeString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Yenileme başarısız oldu.");
    } finally {
      setLoading(false);
    }
  };

  const videos = useMemo(() => mergeVideos(fresh, cached), [fresh, cached]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Arama ve filtreler */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-3 items-center">
        <input
          type="text"
          placeholder="Anahtar kelime..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="tr">Türkçe</option>
          <option value="en">İngilizce</option>
        </select>

        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as "relevance" | "date" | "viewCount")}
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

      {/* Yenile butonu: ayrı satırda net görünsün */}
      <div className="mb-4">
        <button
          type="button"
          onClick={refreshFreshOnly}
          disabled={loading}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          title="YouTube'dan taze veriyi çek, cache'e yaz ve listeyi güncelle"
        >
          {loading ? "Yükleniyor…" : "🔄 Yenile (fresh)"}
        </button>
      </div>

      <div className="text-xs text-zinc-500 mb-4 flex items-center gap-3">
        <span>Son güncelleme: {lastUpdated || "-"}</span>
        <span>•</span>
        <span>Toplam: {videos.length}</span>
        {error && <span className="text-red-500 ml-3">{error}</span>}
      </div>

      <VideoList
        videos={videos}
        loading={loading}
        onVideoSelect={(id, notes) => {
          console.log("Selected:", id, notes);
        }}
      />
    </div>
  );
}
