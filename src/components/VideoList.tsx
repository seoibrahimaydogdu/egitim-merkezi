import React, { useState, useEffect } from "react";
import { getClientId } from "../utils/clientId";
import ModalPlayer from "../components/ModalPlayer";
import VideoSummarizer from "../components/VideoSummarizer";

type NewVideo = {
  video_id: string;
  title: string;
  published_at: string;
  thumbnail: string;
  channel_title: string;
};

const CATS = [
  { id: "all", label: "All Topics" },
  { id: "basics", label: "SEO Basics" },
  { id: "technical", label: "Technical SEO" },
  { id: "content", label: "Content Marketing" },
  { id: "link", label: "Link Building" },
  { id: "analytics", label: "Analytics & Tracking" },
];

const PATHS = [
  { title: "SEO Basics", desc: "Start your SEO journey with essentials", lessons: 5, hours: 2 },
  { title: "Technical SEO Mastery", desc: "Deep dive into site performance", lessons: 8, hours: 4 },
  { title: "Content & Strategy", desc: "Create content that ranks", lessons: 6, hours: 3 },
];

export default function EducationCenter({ onModalToggle }: { onModalToggle: (isOpen: boolean) => void }) {
  const [query, setQuery] = useState("seo");
  const [input, setInput] = useState("seo");
  const [lang, setLang] = useState("en");
  const [cat, setCat] = useState("all");

  const [videos, setVideos] = useState<NewVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const [newVideos, setNewVideos] = useState<NewVideo[]>([]);
  const [checkingForNew, setCheckingForNew] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedVideoNotes, setSelectedVideoNotes] = useState<string | null>(null);

  const baseUrl = (q: string) =>
    `http://localhost:8000/videos?query=${encodeURIComponent(q)}&language=${encodeURIComponent(lang)}&max_results=12`;

  const fetchVideos = async (searchQuery: string, fresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl(searchQuery)}${fresh ? "&fresh=true" : ""}`);
      const data = await res.json();
      setVideos(data.items || []);
    } catch (err) {
      console.error("Video listesi çekilirken hata oluştu:", err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshFreshOnly = async () => {
    await fetchVideos(query, true);
    localStorage.setItem(`last_search_time_${query}`, new Date().toISOString());
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newQuery = input.trim();
    if (!newQuery || newQuery === query) return;
    setQuery(newQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openModal = (videoId: string, notes?: string) => {
    setSelectedVideoId(videoId);
    setSelectedVideoNotes(notes ?? null);
    setIsModalOpen(true);
    onModalToggle(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVideoId(null);
    setSelectedVideoNotes(null);
    onModalToggle(false);
  };

  useEffect(() => {
    fetchVideos(query, false);

    const lastSearchTimeKey = `last_search_time_${query}`;
    const lastSearchTime = localStorage.getItem(lastSearchTimeKey);
    if (!lastSearchTime) {
      localStorage.setItem(lastSearchTimeKey, new Date().toISOString());
      return;
    }

    setCheckingForNew(true);
    fetch(
      `http://localhost:8000/new_videos?query=${encodeURIComponent(query)}&last_checked_at=${lastSearchTime}`
    )
      .then((res) => res.json())
      .then((data) => {
        setNewVideos(data.items || []);
        setCheckingForNew(false);
      })
      .catch((err) => {
        console.error("Yeni videolar kontrol edilirken hata oluştu:", err);
        setCheckingForNew(false);
      });
  }, [query, lang]);

  const clearAlert = () => {
    const now = new Date().toISOString();
    localStorage.setItem(`last_search_time_${query}`, now);
    setVideos((prev) => [...newVideos, ...prev]);
    setNewVideos([]);
  };

  const filteredVideos =
    cat === "all"
      ? videos
      : videos.filter((v) => {
          const hay = `${v.title}`;
          if (cat === "basics") return /beginner|basics|intro/i.test(hay);
          if (cat === "technical") return /technical|site|crawl|page speed|core web/i.test(hay);
          if (cat === "content") return /content|copy|writing|topic/i.test(hay);
          if (cat === "link") return /link|backlink|outreach/i.test(hay);
          if (cat === "analytics") return /analytics|ga4|tracking|tag/i.test(hay);
          return true;
        });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {!isModalOpen && (
        <>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">Education Center</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Master SEO with tutorials, guides and expert insights.</p>
          </div>

          <form onSubmit={submit} className="flex flex-wrap gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search content…"
              className="flex-1 min-w-[220px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50"
            />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50"
            >
              <option value="en">English Content</option>
              <option value="tr">Türkçe İçerik</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Search
            </button>
            <button
              type="button"
              onClick={refreshFreshOnly}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:opacity-90 disabled:opacity-50"
              title="YouTube'dan taze veriyi çek, cache'e yaz ve listeyi güncelle"
            >
              {loading ? "Loading…" : "🔄 Refresh (fresh)"}
            </button>
          </form>

          {newVideos.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-400 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-yellow-500 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Yeni İçerik!</h3>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    "{query}" anahtar kelimesiyle ilgili {newVideos.length} yeni video yayınlandı.
                  </p>
                </div>
              </div>
              <button
                onClick={clearAlert}
                className="text-sm text-yellow-700 underline hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
              >
                Kapat
              </button>
            </div>
          )}
          {checkingForNew && (
            <div className="text-zinc-500 text-center dark:text-zinc-400">Yeni videolar kontrol ediliyor...</div>
          )}

          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`px-3 py-1 rounded-full border text-sm ${
                  cat === c.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 dark:text-white">Featured Learning Paths</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {PATHS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-zinc-200 shadow-sm hover:shadow-md transition dark:from-zinc-800 dark:to-zinc-800 dark:border-zinc-700 dark:text-zinc-50"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.desc}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                    <span>
                      {p.lessons} lessons • {p.hours} hours
                    </span>
                    <button
                      onClick={() => openModal("qS-u5-fN-G0", "Örnek SEO notları")}
                      className="text-blue-600 font-medium"
                    >
                      Start Learning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GRID */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading && (
              <div className="col-span-full text-center text-zinc-500 dark:text-zinc-400">Loading…</div>
            )}
            {!loading && filteredVideos.map((v) => {
              const isBeginner = /beginner|intro|basics/i.test(v.title);
              return (
                <div
                  key={v.video_id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition bg-white dark:bg-zinc-900"
                >
                  <div className="relative group">
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-full aspect-video object-cover"
                    />
                    {/* Overlay play button */}
                    <button
                      onClick={() => openModal(v.video_id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition"
                      aria-label="Videoyu aç"
                      title="Videoyu aç"
                    >
                      <span className="rounded-xl w-16 h-12 flex items-center justify-center shadow-lg"
                            style={{ background: "#FF0000" }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z"></path>
                        </svg>
                      </span>
                    </button>
                  </div>

                  <div className="p-4">
                    {/* ▼ Etiketler: seviye + SEO */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border
                        ${isBeginner
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"}`}>
                        {isBeginner ? "beginner" : "intermediate"}
                      </span>

                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border
                        bg-blue-50 text-blue-700 border-blue-200
                        dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700">
                        SEO
                      </span>
                    </div>

                    <h3 className="font-semibold line-clamp-2 text-zinc-900 dark:text-zinc-50">
                      {v.title}
                    </h3>
                    <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {v.channel_title}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{new Date(v.published_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => openModal(v.video_id)}
                        className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        Watch
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && filteredVideos.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 dark:text-zinc-400">
                No videos found.
              </div>
            )}
          </div>
        </>
      )}

      {isModalOpen && selectedVideoId && (
        <ModalPlayer
          videoId={selectedVideoId}
          channelId="default-channel-id"
          chapters={[]}
          onClose={closeModal}
        />
      )}
      {isModalOpen && selectedVideoNotes && <VideoSummarizer notes={selectedVideoNotes} />}
    </div>
  );
}
