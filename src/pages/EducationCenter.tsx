import React, { useEffect, useState, useMemo, createContext, useContext } from "react";
import ModalPlayer from "../components/ModalPlayer";
import VideoSummarizer from "../components/VideoSummarizer";
import { supabase } from '../utils/supabaseClient';
import Topics from './Topics';

/* ----------------- Context Setup ----------------- */
const EducationCenterContext = createContext(null);

export function useEducationCenter() {
  const context = useContext(EducationCenterContext);
  if (!context) {
    throw new Error('useEducationCenter must be used within an EducationCenterProvider');
  }
  return context;
}

/* ----------------- Types ----------------- */
type NewVideo = {
  video_id: string;
  title: string;
  published_at: string;
  thumbnail: string;
  channel_title: string;
  channel_id?: string;
  duration?: string;
  topic?: string;
};

/* ----------------- Constants ----------------- */
const CATS = [
  { id: "all", label: "All Topics" },
  { id: "basics", label: "SEO Basics" },
  { id: "technical", label: "Technical SEO" },
  { id: "content", label: "Content Marketing" },
  { id: "link", label: "Link Building" },
  { id: "analytics", "label": "Analytics & Tracking" },
] as const;

// Simülasyon için örnek bir VideoModal bileşeni
const VideoModal = ({ videoId, onClose }) => {
  const [activeTab, setActiveTab] = useState('konular');
  const { followedTopics, onFollowTopic, user, videos } = useEducationCenter();
  const video = useMemo(() => videos.find(v => v.video_id === videoId), [videoId, videos]);

  const videoTopics = useMemo(() => {
    return [
      { name: "Content Marketing", isSuggested: false },
      { name: "Technical SEO", isSuggested: false },
      { name: "SEO", isSuggested: true },
      { name: "Off-Page SEO", isSuggested: true },
    ];
  }, [videoId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Başlığı ve Kapatma Butonu */}
        <div className="p-4 flex justify-between items-center border-b dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{video?.title || "Video Detayı"}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-center items-center h-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg">
            <p className="text-zinc-500">Video oynatıcı alanı ({videoId})</p>
          </div>

          <div className="mt-4 border-b dark:border-zinc-800 flex gap-4">
            <button
              onClick={() => setActiveTab('notlar')}
              className={`py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'notlar' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Notlar
            </button>
            <button
              onClick={() => setActiveTab('konular')}
              className={`py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'konular' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Konular
            </button>
            <button
              onClick={() => setActiveTab('özet')}
              className={`py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'özet' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Özet
            </button>
          </div>

          {activeTab === 'konular' && (
            <div className="mt-4 p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">TAKİP ETTİKLERİN</p>
                <div className="flex flex-wrap gap-2">
                  {followedTopics.length > 0 ? (
                    followedTopics.map(topic => (
                      <span key={topic} className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm">
                        {topic}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">Takip ettiğiniz bir konu yok.</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">ÖNERİLEN KONULAR</p>
                <div className="flex flex-wrap gap-2">
                  {videoTopics.filter(t => !followedTopics.includes(t.name)).map(topic => (
                    <button
                      key={topic.name}
                      onClick={() => onFollowTopic(topic.name)}
                      className="px-3 py-1 rounded-full border border-zinc-300 text-zinc-600 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      + {topic.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notlar' && (
            <div className="mt-4 p-4">
              <p className="text-zinc-500 dark:text-zinc-400">Not alma alanı burada yer alacak.</p>
            </div>
          )}

          {activeTab === 'özet' && (
            <div className="mt-4 p-4">
              {/* Buraya VideoSummarizer bileşenini yerleştirebilirsiniz */}
              <p className="text-zinc-500 dark:text-zinc-400">Video özeti burada yer alacak.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


/* =========================================================
    EducationCenter Page
    ========================================================= */
export default function EducationCenter() {
  /* --------- Search / filters --------- */
  const [query, setQuery] = useState("seo");
  const [input, setInput] = useState("seo");
  const [lang, setLang] = useState("en");
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [level, setLevel] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");

  const [videos, setVideos] = useState<NewVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* --------- Tab Navigation State --------- */
  const [activeTab, setActiveTab] = useState('videos');

  /* --------- Supabase States --------- */
  const [followedTopics, setFollowedTopics] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  /* ----------------- Helpers ----------------- */
  const baseUrl = (q: string) =>
    `http://localhost:8000/videos?query=${encodeURIComponent(q)}&language=${encodeURIComponent(
      lang
    )}&max_results=12`;

  const fetchVideos = async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await fetch(baseUrl(searchQuery));
      const data = await res.json();
      setVideos(data.items || []);
    } catch (err) {
      console.error("Video listesi çekilirken hata oluştu:", err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const getTopicFromTitle = (title: string): string => {
    const hay = title.toLowerCase();
    for (const cat of CATS) {
      if (cat.id === "all") continue;
      if (cat.id === "basics" && /beginner|basics|intro/i.test(hay)) return cat.label;
      if (cat.id === "technical" && /technical|site|crawl|page speed|core web/i.test(hay)) return cat.label;
      if (cat.id === "content" && /content|copy|writing|topic/i.test(hay)) return cat.label;
      if (cat.id === "link" && /link|backlink|outreach/i.test(hay)) return cat.label;
      if (cat.id === "analytics" && /analytics|ga4|tracking|tag/i.test(hay)) return cat.label;
    }
    return "General";
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newQuery = input.trim();
    if (!newQuery || newQuery === query) return;
    setQuery(newQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  const openModal = (videoId: string) => {
    setSelectedVideoId(videoId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVideoId(null);
  };

  const handleFollowTopic = async (topic: string) => {
    if (!user) {
      alert("Takip etmek için giriş yapmalısınız.");
      return;
    }

    if (followedTopics.includes(topic)) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('video_topics')
      .insert({ topic, user_id: user.id });

    if (error) {
      console.error("Konu takip edilirken hata oluştu:", error);
      setError("Konu takip edilirken bir hata oluştu.");
    } else {
      setFollowedTopics([...followedTopics, topic]);
    }
    setLoading(false);
  };

  /* =========================================================
    Effects
    ========================================================= */
  useEffect(() => {
    const fetchUserDataAndVideos = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        const { data: followedData, error: followedError } = await supabase
          .from('video_topics')
          .select('topic')
          .eq('user_id', session.user.id);
          
        if (followedError) {
          console.error("Takip edilen konular çekilirken hata oluştu:", followedError);
        } else {
          setFollowedTopics(followedData.map(item => item.topic));
        }
      }
      
      if (activeTab === 'videos') {
         await fetchVideos(query);
      }
      setLoading(false);
    };

    fetchUserDataAndVideos();
  }, [query, lang, activeTab]);
  
  const filteredVideos = useMemo(() => {
    let tempVideos = videos.map(v => ({ ...v, topic: getTopicFromTitle(v.title) }));

    if (cat !== "all") {
      tempVideos = tempVideos.filter((v) => {
        const hay = `${v.title}`;
        if (cat === "basics") return /beginner|basics|intro/i.test(hay);
        if (cat === "technical") return /technical|site|crawl|page speed|core web/i.test(hay);
        if (cat === "content") return /content|copy|writing|topic/i.test(hay);
        if (cat === "link") return /link|backlink|outreach/i.test(hay);
        if (cat === "analytics") return /analytics|ga4|tracking|tag/i.test(hay);
        return true;
      });
    }

    if (level !== "all") {
      tempVideos = tempVideos.filter((v) => {
        const hay = v.title.toLowerCase();
        const isBeginner = /beginner|basics|intro/.test(hay);
        const isAdvanced = /advanced|mastery|expert/.test(hay);
        if (level === "beginner") return isBeginner;
        if (level === "intermediate") return !isBeginner && !isAdvanced;
        if (level === "advanced") return isAdvanced;
        return true;
      });
    }

    return tempVideos;
  }, [videos, cat, level]);

  /* =========================================================
    Render
    ========================================================= */
  return (
    <EducationCenterContext.Provider value={{ videos: filteredVideos, user, followedTopics, onFollowTopic: handleFollowTopic }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Education Center
          </h1>
        </div>

        <p className="text-zinc-500 dark:text-zinc-400">
          Master SEO with tutorials, guides and expert insights.
        </p>
        
        {/* Tabs Navigation */}
        <div className="flex items-center justify-start gap-4 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('videos')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'videos' 
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'favorites' 
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Favorites
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'topics' 
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Takip Ettiğim Konular
          </button>
        </div>

        {activeTab === 'videos' && (
          <>
            {/* Search bar */}
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
            </form>

            {/* Category filters */}
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

            {/* Difficulty Level Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLevel("all")}
                className={`px-3 py-1 rounded-full border text-sm ${
                  level === "all"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                All Levels
              </button>
              <button
                onClick={() => setLevel("beginner")}
                className={`px-3 py-1 rounded-full border text-sm ${
                  level === "beginner"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                Beginner
              </button>
              <button
                onClick={() => setLevel("intermediate")}
                className={`px-3 py-1 rounded-full border text-sm ${
                  level === "intermediate"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                Intermediate
              </button>
              <button
                onClick={() => setLevel("advanced")}
                className={`px-3 py-1 rounded-full border text-sm ${
                  level === "advanced"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700"
                }`}
              >
                Advanced
              </button>
            </div>

            {/* GRID */}
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {loading && (
                <div className="col-span-full text-center text-zinc-500 dark:text-zinc-400">
                  Loading…
                </div>
              )}
              {!loading &&
                filteredVideos.map((v) => {
                  const hay = v.title.toLowerCase();
                  const isBeginner = /beginner|basics|intro/.test(hay);
                  const isAdvanced = /advanced|mastery|expert/.test(hay);
                  const difficultyLevel = isBeginner ? "beginner" : isAdvanced ? "advanced" : "intermediate";
                  const topicName = v.topic || "General";
                  const isFollowed = followedTopics.includes(topicName);

                  let levelTagClasses = "";
                  let levelTagText = "";

                  if (difficultyLevel === "beginner") {
                    levelTagClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700";
                    levelTagText = "Beginner";
                  } else if (difficultyLevel === "intermediate") {
                    levelTagClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700";
                    levelTagText = "Intermediate";
                  } else {
                    levelTagClasses = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700";
                    levelTagText = "Advanced";
                  }

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

                        {/* Play overlay */}
                        <button
                          onClick={() => openModal(v.video_id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition"
                          aria-label="Videoyu aç"
                          title="Videoyu aç"
                        >
                          <span
                            className="rounded-xl w-16 h-12 flex items-center justify-center shadow-lg"
                            style={{ background: "#FF0000" }}
                          >
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </button>
                      </div>

                      <div className="p-4">
                        {/* Etiketler: seviye + konu */}
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${levelTagClasses}`}
                          >
                            {levelTagText}
                          </span>
                          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200 dark:border-blue-700">
                            {topicName}
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
                          {user && (
                            <button
                              onClick={() => handleFollowTopic(topicName)}
                              disabled={isFollowed}
                              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors duration-200 ${
                                isFollowed
                                  ? 'bg-green-500 text-white cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isFollowed ? 'Takip Ediliyor' : 'Takip Et'}
                            </button>
                          )}
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

        {activeTab === 'favorites' && (
          <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
            Favori videolarınız burada listelenecek.
          </div>
        )}

        {activeTab === 'topics' && (
          <Topics />
        )}

        {isModalOpen && selectedVideoId && (
          <VideoModal
            videoId={selectedVideoId}
            onClose={closeModal}
          />
        )}
      </div>
    </EducationCenterContext.Provider>
  );
}
