// ModalPlayer.tsx
import React, { useEffect, useRef, useState } from "react";
import { getClientId } from "../utils/clientId";
import VideoSummarizer from "./VideoSummarizer";
import type { VideoNote } from "../utils/notes";
import { addNoteRemote } from "../utils/notes";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type Chapter = { start_seconds: number; title: string };

type Resource = {
  id: string;
  video_id: string;
  chapter_title: string;
  start_seconds: number;
  end_seconds: number;
  title: string;
  type: string;
  url: string;
};

type Highlight = {
  id: string;
  session_id: string;
  t_seconds: number;
  highlight_text: string;
  created_at: string;
};

type Props = {
  videoId: string;
  channelId: string;
  title?: string;
  videoTitle?: string;
  query?: string;
  chapters?: Chapter[];
  onClose: () => void;

  existingNotes?: VideoNote[];
  onAddNote?: (text: string, timestamp: number) => void;
};

/* ----------------- Otomatik konu çıkarımı ----------------- */
const TOPIC_CATALOG = [
  "SEO",
  "Technical SEO",
  "On-Page SEO",
  "Off-Page SEO",
  "Local SEO",
  "E-commerce SEO",
  "Content Marketing",
  "Keyword Research",
  "Backlink",
  "Link Building",
  "Analytics",
  "GA4",
  "CRO",
  "Page Speed",
  "Core Web Vitals",
  "Dijital Pazarlama",
];

const inferTopics = (text: string): string[] => {
  const hay = (text || "").toLowerCase();
  const out = new Set<string>();
  if (/\bseo\b/.test(hay)) out.add("SEO");
  if (/(technical seo|site|crawl|core web|page speed)/i.test(hay)) out.add("Technical SEO");
  if (/(on[-\s]?page)/i.test(hay)) out.add("On-Page SEO");
  if (/(off[-\s]?page|backlink|link building)/i.test(hay)) {
    out.add("Off-Page SEO");
    out.add("Link Building");
    out.add("Backlink");
  }
  if (/(local seo|gmb|google business)/i.test(hay)) out.add("Local SEO");
  if (/(e[-\s]?commerce|shopify|woocommerce|magento)/i.test(hay)) out.add("E-commerce SEO");
  if (/(content|topic|copywriting)/i.test(hay)) out.add("Content Marketing");
  if (/(keyword|kw|search intent)/i.test(hay)) out.add("Keyword Research");
  if (/(analytics|ga4|gtm|tracking|events)/i.test(hay)) {
    out.add("Analytics");
    out.add("GA4");
  }
  if (/(conversion|cro|a\/b|ab test)/i.test(hay)) out.add("CRO");
  if (/(page speed|lcp|cls|fid|core web vitals)/i.test(hay)) {
    out.add("Page Speed");
    out.add("Core Web Vitals");
  }
  if (/(digital marketing|dijital pazarlama)/i.test(hay)) out.add("Dijital Pazarlama");
  return Array.from(out);
};
/* ---------------------------------------------------------- */

const getCuratedTitle = (title: string): string => {
  const parts = title.split("|");
  const firstPart = parts[0].trim();
  return firstPart.length > 50 ? firstPart.substring(0, 50) + "..." : firstPart;
};

export default function ModalPlayer({
  videoId,
  channelId,
  title,
  videoTitle,
  query = "",
  chapters = [],
  onClose,
  existingNotes = [],
  onAddNote,
}: Props) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [newHighlight, setNewHighlight] = useState("");
  const clientId = getClientId();

  // topics
  const [newTopicKeyword, setNewTopicKeyword] = useState("");
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);
  const [isSubscribingTopic, setIsSubscribingTopic] = useState(false);
  const [panelView, setPanelView] = useState<"notes" | "topics" | "summary">("notes");
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  // ❤️ favorite
  const [isFav, setIsFav] = useState(false);
  const [updatingFav, setUpdatingFav] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // YouTube API yükle
  useEffect(() => {
    if (window.YT?.Player) return;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(s);
    window.onYouTubeIframeAPIReady = () => {};
  }, []);

  // Session start
  useEffect(() => {
    fetch("http://localhost:8000/video/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: clientId, video_id: videoId, query }),
    })
      .then((r) => r.json())
      .then((d) => setSessionId(d.session_id))
      .catch(() => {});
  }, [clientId, videoId, query]);

  // Player init
  useEffect(() => {
    if (!containerRef.current) return;

    const interval = setInterval(() => {
      if (window.YT?.Player && !playerRef.current) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: any) => {
              setReady(true);
              try {
                e.target.playVideo();
              } catch {}
            },
            onStateChange: (e: any) => {
              const state = e.data;
              if (!sessionId) return;
              let ev = "";
              if (state === 1) ev = "play";
              else if (state === 2) ev = "pause";
              else if (state === 0) ev = "ended";
              if (ev) {
                const t = Math.floor(playerRef.current?.getCurrentTime?.() || 0);
                fetch("http://localhost:8000/video/ping", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ session_id: sessionId, t_seconds: t, event: ev }),
                }).catch(() => {});
              }
            },
          },
        });
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [videoId, sessionId]);

  // Zaman/ping
  useEffect(() => {
    if (!ready) return;

    const poll = setInterval(() => {
      const t = Math.floor(playerRef.current?.getCurrentTime?.() || 0);
      setCurrentTime(t);
    }, 1000);

    if (sessionId) {
      const hb = setInterval(() => {
        const t = Math.floor(playerRef.current?.getCurrentTime?.() || 0);
        fetch("http://localhost:8000/video/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, t_seconds: t, event: "heartbeat" }),
        }).catch(() => {});
      }, 5000);
      return () => {
        clearInterval(poll);
        clearInterval(hb);
      };
    }

    return () => clearInterval(poll);
  }, [ready, sessionId]);

  const close = () => {
    if (sessionId) {
      fetch("http://localhost:8000/video/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      }).catch(() => {});
    }
    try {
      playerRef.current?.stopVideo?.();
      playerRef.current?.destroy?.();
    } catch {}
    onClose();
  };

  const seekTo = (sec: number) => {
    if (!playerRef.current?.seekTo) return;
    playerRef.current.seekTo(sec, true);
  };

  // resources
  useEffect(() => {
    fetch(`http://localhost:8000/video/resources/${videoId}`)
      .then((res) => res.json())
      .then((data) => setResources(data.resources || []))
      .catch((err) => console.error("Kaynaklar çekilirken hata oluştu:", err));
  }, [videoId]);

  // highlights
  useEffect(() => {
    if (!sessionId) return;
    fetch(`http://localhost:8000/video/highlights/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setHighlights(data.highlights || []))
      .catch((err) => console.error("Notlar çekilirken hata oluştu:", err));
  }, [sessionId]);

  // topics list (global – channel filtresi olmadan)
  useEffect(() => {
    if (!clientId) return;
    fetch(`http://localhost:8000/subscribe/topics?user_id=${clientId}`)
      .then((res) => res.json())
      .then((data) => setSubscribedTopics(data.topics || []))
      .catch((err) => console.error("Takip edilen konular çekilirken hata oluştu:", err));
  }, [clientId]);

  // otomatik konu öner
  useEffect(() => {
    const base = `${videoTitle || title || ""} ${query || ""}`;
    const inferred = inferTopics(base);
    const seed = new Set<string>([...inferred, "SEO", "Content Marketing", "Technical SEO"]);
    setSuggestedTopics(Array.from(seed));
  }, [videoId, videoTitle, title, query]);

  // ❤️ favori durumu (açılışta)
  useEffect(() => {
    if (!clientId || !videoId) return;
    fetch(`http://localhost:8000/favorites?user_id=${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, boolean> = {};
        (d.items || []).forEach((row: any) => (map[row.video_id] = true));
        setIsFav(!!map[videoId]);
      })
      .catch(() => {});
  }, [clientId, videoId]);

  const toggleFav = async () => {
    if (!clientId || !videoId || updatingFav) return;
    setUpdatingFav(true);
    const next = !isFav;
    setIsFav(next); // optimistic

    try {
      if (next) {
        await fetch(
          `http://localhost:8000/favorites?user_id=${clientId}&video_id=${videoId}&query=${encodeURIComponent(
            query || ""
          )}`,
          { method: "POST" }
        );
      } else {
        await fetch(
          `http://localhost:8000/favorites?user_id=${clientId}&video_id=${videoId}`,
          { method: "DELETE" }
        );
      }
    } catch {
      // rollback on error
      setIsFav(!next);
    } finally {
      setUpdatingFav(false);
    }
  };

  // --- Not Ekle (highlight + Supabase note) ---
  const addHighlight = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = newHighlight.trim();
    if (!text) return;

    const t = Math.floor(playerRef.current?.getCurrentTime?.() || 0);

    const optimistic: Highlight = {
      id: `tmp_${Date.now()}`,
      session_id: sessionId || "tmp",
      t_seconds: t,
      highlight_text: text,
      created_at: new Date().toISOString(),
    };
    setHighlights((prev) => [...prev, optimistic]);
    setNewHighlight("");

    if (sessionId) {
      try {
        const res = await fetch("http://localhost:8000/video/highlights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, t_seconds: t, highlight_text: text }),
        });
        const data = await res.json();
        if (data?.highlight) {
          setHighlights((prev) => prev.map((h) => (h.id === optimistic.id ? data.highlight : h)));
        }
      } catch (err) {
        console.error("Not eklenirken hata oluştu:", err);
      }
    }

    try {
      await addNoteRemote({
        videoId,
        videoTitle: videoTitle || title || null,
        at: t,
        text,
      });
    } catch (e) {
      console.error("Supabase note insert error:", e);
    }

    onAddNote?.(text, t);
  };

  const activeResources = resources.filter(
    (r) => currentTime >= r.start_seconds && currentTime < (r.end_seconds || Infinity)
  );

  const activeIdx = (() => {
    if (!chapters.length) return -1;
    let idx = -1;
    for (let i = 0; i < chapters.length; i++) {
      const cur = chapters[i].start_seconds;
      const next = chapters[i + 1]?.start_seconds ?? Infinity;
      if (currentTime >= cur && currentTime < next) {
        idx = i;
        break;
      }
    }
    return idx;
  })();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        const next = activeIdx < 0 ? 0 : Math.min(activeIdx + 1, chapters.length - 1);
        seekTo(chapters[next].start_seconds);
      } else if (e.key === "ArrowLeft") {
        const prev = activeIdx <= 0 ? 0 : activeIdx - 1;
        seekTo(chapters[prev].start_seconds);
      } else if (e.key === "Escape") {
        close();
      }
    };
    if (chapters.length > 0) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, chapters]);

  const fmt = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  };

  const displayTitle = getCuratedTitle(videoTitle || title || "");

  async function handleUnsubscribeTopic(topic: string): Promise<void> {
    if (!clientId || !channelId) return;
    try {
      await fetch("http://localhost:8000/subscribe/topics/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: clientId, channel_id: channelId, topic }),
      });
      setSubscribedTopics((prev) => prev.filter((t) => t !== topic));
    } catch (err) {
      console.error("Konudan çıkılırken hata oluştu:", err);
    }
  }

  async function handleSubscribeTopic(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const topic = newTopicKeyword.trim();
    if (!topic || !clientId || !channelId) return;
    await quickSubscribe(topic);
    setNewTopicKeyword("");
  }

  const quickSubscribe = async (topic: string) => {
    if (!clientId || !channelId) return;
    setIsSubscribingTopic(true);
    try {
      await fetch("http://localhost:8000/subscribe/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: clientId, channel_id: channelId, topic }),
      });
      setSubscribedTopics((prev) => Array.from(new Set([...prev, topic])));
    } catch (err) {
      console.error("Konu takip edilirken hata oluştu:", err);
    } finally {
      setIsSubscribingTopic(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-colors ${isDarkMode ? "bg-zinc-900/90" : "bg-white/90"} backdrop-blur-sm`}
      onClick={close}
    >
      <div className="flex w-full h-full" onClick={(e) => e.stopPropagation()}>
        {/* Sol: Player */}
        <div className="relative flex-1 w-full h-full">
          <div
            className="absolute left-4 right-[140px] top-4 z-40 text-white/95 text-base font-semibold line-clamp-2"
            title={displayTitle}
          >
            {displayTitle}
          </div>

          {/* Player */}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {chapters.length > 0 && (
            <div className="absolute left-0 right-0 bottom-0 z-40 p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
              <div className="mb-2 text-xs uppercase tracking-wide text-white/70">Bölümler</div>
              <div className="flex gap-2 overflow-x-auto pr-2 scrollbar-thin">
                {chapters.map((c, i) => {
                  const active = i === activeIdx;
                  return (
                    <button
                      key={i}
                      onClick={() => seekTo(c.start_seconds)}
                      className={
                        "relative shrink-0 px-3 py-2 rounded-xl backdrop-blur text-sm transition text-left " +
                        (active
                          ? "bg-white text-zinc-900 border-2 border-white shadow-lg"
                          : "bg-white/10 text-white border border-white/20 hover:bg-white/20")
                      }
                      title={c.title}
                    >
                      {active && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white shadow">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                      <div className={"font-semibold truncate max-w-[220px] " + (active ? "text-zinc-900" : "text-white")}>
                        {c.title}
                      </div>
                      <div className={"mt-0.5 text-[11px] " + (active ? "text-zinc-700 font-medium" : "text-white/70")}>
                        {fmt(c.start_seconds)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeResources.length > 0 && (
            <div className="absolute top-20 right-4 z-40 w-80 p-4 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-zinc-200 text-zinc-900">
              <h4 className="text-sm font-bold mb-2 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                İlgili Kaynaklar
              </h4>
              <ul className="space-y-2">
                {activeResources.map((res) => (
                  <li key={res.id}>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors"
                    >
                      <span className="font-medium">{res.title}</span>
                      <span className="ml-2 text-xs text-zinc-500 uppercase">{res.type}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sağ: Panel */}
        <div
          className={`w-1/3 min-w-[320px] max-w-[400px] h-full flex flex-col p-6
          ${isDarkMode ? "bg-gradient-to-b from-zinc-800 to-zinc-900 border-l border-zinc-700 text-white" : "bg-gradient-to-b from-gray-100 to-white border-l border-gray-200 text-zinc-900"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex space-x-4 flex-1">
              <button
                onClick={() => setPanelView("notes")}
                className={`text-lg font-semibold border-b-2 transition-colors pb-1 ${
                  panelView === "notes"
                    ? isDarkMode
                      ? "text-white border-blue-500"
                      : "text-zinc-900 border-blue-500"
                    : isDarkMode
                    ? "text-zinc-500 border-transparent hover:text-white"
                    : "text-zinc-400 border-transparent hover:text-zinc-900"
                }`}
              >
                Notlar
              </button>
              <button
                onClick={() => setPanelView("topics")}
                className={`text-lg font-semibold border-b-2 transition-colors pb-1 ${
                  panelView === "topics"
                    ? isDarkMode
                      ? "text-white border-blue-500"
                      : "text-zinc-900 border-blue-500"
                    : isDarkMode
                    ? "text-zinc-500 border-transparent hover:text-white"
                    : "text-zinc-400 border-transparent hover:text-zinc-900"
                }`}
              >
                Konular
              </button>
              <button
                onClick={() => setPanelView("summary")}
                className={`text-lg font-semibold border-b-2 transition-colors pb-1 ${
                  panelView === "summary"
                    ? isDarkMode
                      ? "text-white border-blue-500"
                      : "text-zinc-900 border-blue-500"
                    : isDarkMode
                    ? "text-zinc-500 border-transparent hover:text-white"
                    : "text-zinc-400 border-transparent hover:text-zinc-900"
                }`}
              >
                Özet
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* ❤️ Like / Favorite */}
              <button
                onClick={toggleFav}
                disabled={updatingFav}
                title={isFav ? "Beğenmekten vazgeç" : "Beğen"}
                className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-md transition ${
                  isDarkMode
                    ? "bg-zinc-800 text-white/80 hover:text-white hover:bg-zinc-700"
                    : "bg-white text-zinc-600 hover:text-red-600 hover:bg-zinc-100"
                } ${updatingFav ? "opacity-60 cursor-not-allowed" : ""}`}
                aria-pressed={isFav}
                aria-label="Beğen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill={isFav ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21.35z" />
                </svg>
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-md transition
                  ${isDarkMode ? "bg-zinc-800 text-white/70 hover:text-white hover:bg-zinc-700" : "bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"}`}
                title={isDarkMode ? "Aydınlık Temaya Geç" : "Koyu Temaya Geç"}
              >
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                )}
              </button>

              <button
                onClick={close}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-500 text-white shadow-md hover:bg-red-600 transition"
                aria-label="Kapat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Notlar */}
          {panelView === "notes" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-thin">
              {existingNotes.length > 0 && (
                <>
                  <div className="text-xs uppercase tracking-wide mb-1 opacity-70">Yerel Notlar</div>
                  {existingNotes.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200"
                      }`}
                      onClick={() => seekTo((n as any).timestamp)}
                    >
                      <div className="text-sm font-medium line-clamp-3">{n.text}</div>
                      <div className="text-xs mt-1">{fmt((n as any).timestamp)}</div>
                    </div>
                  ))}
                </>
              )}

              <div className="text-xs uppercase tracking-wide mt-3 mb-1 opacity-70">Oturum Notları</div>
              {highlights.length > 0 ? (
                highlights.map((h) => (
                  <div
                    key={h.id}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    onClick={() => seekTo(h.t_seconds)}
                  >
                    <div className="text-sm font-medium line-clamp-3">{h.highlight_text}</div>
                    <div className="text-xs mt-1">{fmt(h.t_seconds)}</div>
                  </div>
                ))
              ) : (
                <div className={`text-center py-6 ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>Henüz bir notun yok.</div>
              )}
            </div>
          )}

          {panelView === "topics" && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-4 scrollbar-thin">
              {/* Takip Ettiklerin */}
              <div>
                <div className="text-xs uppercase tracking-wide mb-2 opacity-70">Takip Ettiklerin</div>
                {subscribedTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {subscribedTopics.map((topic) => (
                      <div
                        key={topic}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          isDarkMode ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        <span>{topic}</span>
                        <button
                          onClick={() => handleUnsubscribeTopic(topic)}
                          className="rounded-full p-[2px] hover:bg-black/10"
                          aria-label={`${topic} konusunu takibi bırak`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>Henüz takip ettiğin bir konu yok.</div>
                )}
              </div>

              {/* Önerilen Konular */}
              <div>
                <div className="text-xs uppercase tracking-wide mb-2 opacity-70">Önerilen Konular</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([...suggestedTopics, ...TOPIC_CATALOG]))
                    .filter((t) => !subscribedTopics.includes(t))
                    .slice(0, 24)
                    .map((t) => (
                      <button
                        key={t}
                        onClick={() => quickSubscribe(t)}
                        className={`px-2 py-1 rounded-full text-xs border transition ${
                          isDarkMode
                            ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                            : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                        }`}
                        disabled={isSubscribingTopic}
                        title={`"${t}" konusunu takip et`}
                      >
                        + {t}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {panelView === "summary" && (
            <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
              <VideoSummarizer
                notes={highlights.length > 0 ? highlights.map((h) => h.highlight_text).join("\n") : "Henüz not bulunmuyor."}
                videoId={videoId}
              />
            </div>
          )}

          {panelView === "notes" && (
            <form onSubmit={addHighlight} className="mt-4 flex flex-col space-y-2">
              <textarea
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                className={`w-full h-24 p-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? "bg-zinc-800 text-white" : "bg-gray-100 text-zinc-900"
                }`}
                placeholder="Bir not almak için buraya yaz..."
              />
              <button
                type="submit"
                disabled={!newHighlight.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:bg-zinc-700 disabled:cursor-not-allowed"
              >
                Not Ekle ({fmt(currentTime)})
              </button>
            </form>
          )}

          {panelView === "topics" && (
            <form onSubmit={handleSubscribeTopic} className="mt-4 flex flex-col space-y-2">
              <input
                type="text"
                value={newTopicKeyword}
                onChange={(e) => setNewTopicKeyword(e.target.value)}
                placeholder="Takip etmek istediğin konuyu yaz..."
                className={`p-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? "bg-zinc-800 text-white border-zinc-700" : "bg-gray-100 text-zinc-900 border-gray-200"
                }`}
              />
              <button
                type="submit"
                disabled={!newTopicKeyword.trim() || isSubscribingTopic}
                className="px-4 py-2 font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:bg-zinc-500 disabled:cursor-not-allowed"
              >
                {isSubscribingTopic ? "Takip Ediliyor..." : "Takip Et"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
