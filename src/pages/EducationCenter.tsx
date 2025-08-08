import React, { useState, useEffect } from "react";
import VideoList from "../components/VideoList";
import { getClientId } from "../utils/clientId";

const CATS = [
  { id: "all", label: "All Topics" },
  { id: "basics", label: "SEO Basics" },
  { id: "technical", label: "Technical SEO" },
  { id: "content", label: "Content Marketing" },
  { id: "link", "label": "Link Building" },
  { id: "analytics", label: "Analytics & Tracking" },
];

const PATHS = [
  { title: "SEO Basics", desc: "Start your SEO journey with essentials", lessons: 5, hours: 2 },
  { title: "Technical SEO Mastery", desc: "Deep dive into site performance", lessons: 8, hours: 4 },
  { title: "Content & Strategy", desc: "Create content that ranks", lessons: 6, hours: 3 },
];

type NewVideo = {
  video_id: string;
  title: string;
  published_at: string;
  thumbnail: string;
  channel_title: string;
};

export default function EducationCenter() {
  const [query, setQuery] = useState("seo");
  const [input, setInput] = useState("seo");
  const [lang, setLang] = useState("en");
  const [cat, setCat] = useState("all");
  const [newVideos, setNewVideos] = useState<NewVideo[]>([]);
  const [checkingForNew, setCheckingForNew] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newQuery = input.trim();
    if (newQuery === query) return;

    // En son arama zamanını kaydet
    const now = new Date().toISOString();
    localStorage.setItem(`last_search_time_${newQuery}`, now);
    
    setQuery(newQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sayfa yüklendiğinde ve arama değiştiğinde yeni videoları kontrol et
  useEffect(() => {
    const lastSearchTime = localStorage.getItem(`last_search_time_${query}`);
    if (!lastSearchTime) {
      // Daha önce arama yapılmamışsa, şimdiki zamanı kaydet ve kontrolü atla
      localStorage.setItem(`last_search_time_${query}`, new Date().toISOString());
      setNewVideos([]);
      return;
    }

    setCheckingForNew(true);
    fetch(`http://localhost:8000/new_videos?query=${encodeURIComponent(query)}&last_checked_at=${lastSearchTime}`)
      .then(res => res.json())
      .then(data => {
        setNewVideos(data.items || []);
        setCheckingForNew(false);
      })
      .catch(err => {
        console.error("Yeni videolar kontrol edilirken hata oluştu:", err);
        setCheckingForNew(false);
      });
  }, [query]); // query değiştiğinde bu useEffect çalışacak

  // Yeni video uyarısını temizleme butonu
  const clearAlert = () => {
    setNewVideos([]);
    const now = new Date().toISOString();
    localStorage.setItem(`last_search_time_${query}`, now);
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Education Center</h1>
        <p className="text-zinc-500">Master SEO with tutorials, guides and expert insights.</p>
      </div>

      {/* Search + Language */}
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search content…"
          className="flex-1 min-w-[220px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="en">English Content</option>
          <option value="tr">Türkçe İçerik</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Yeni Video Uyarısı */}
      {newVideos.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Yeni İçerik!</h3>
              <p className="mt-1 text-sm text-yellow-700">
                "{query}" anahtar kelimesiyle ilgili {newVideos.length} yeni video yayınlandı.
              </p>
            </div>
          </div>
          <button onClick={clearAlert} className="text-sm text-yellow-700 underline hover:text-yellow-900">
            Kapat
          </button>
        </div>
      )}
      {checkingForNew && (
        <div className="text-zinc-500 text-center">Yeni videolar kontrol ediliyor...</div>
      )}

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`px-3 py-1 rounded-full border text-sm ${
              cat === c.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Featured Learning Paths */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Featured Learning Paths</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PATHS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-zinc-200 shadow-sm hover:shadow-md transition"
            >
              <div className="space-y-1">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-zinc-600">{p.desc}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                <span>{p.lessons} lessons • {p.hours} hours</span>
                <a href="#" className="text-blue-600 font-medium">Start Learning</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      <VideoList query={query} language={lang} category={cat} /> {/* ✅ language ve category prop'ları eklendi */}

      {/* FAQ */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">FAQ</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-zinc-600">
          <div>
            <p className="font-medium text-zinc-900">How often is content updated?</p>
            <p>We refresh content regularly to reflect the latest best practices.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-900">Are there certificates?</p>
            <p>Yes, certificates are available for structured learning paths.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-900">Can I suggest topics?</p>
            <p>Absolutely—send us what you want to learn next.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-900">Is live support available?</p>
            <p>Pro plans include priority support and Q&A sessions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}