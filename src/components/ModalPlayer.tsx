import React, { useEffect, useRef, useState } from "react";
import { getClientId } from "../utils/clientId";

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
  title: string;
  query?: string;
  chapters?: Chapter[];
  onClose: () => void;
};

export default function ModalPlayer({ videoId, title, query = "", chapters = [], onClose }: Props) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [newHighlight, setNewHighlight] = useState("");
  const clientId = getClientId();

  // Modal açıldığında scroll kilidi
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // YT Iframe API
  useEffect(() => {
    if (window.YT?.Player) return;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(s);
    window.onYouTubeIframeAPIReady = () => {};
  }, []);

  // Oturum başlat
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
            onReady: () => setReady(true),
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

  // Heartbeat (5sn) + currentTime poll (1sn)
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
      return () => { clearInterval(poll); clearInterval(hb); };
    }

    return () => clearInterval(poll);
  }, [ready, sessionId]);

  // Kapat
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

  // Chapter’a git
  const seekTo = (sec: number) => {
    if (!playerRef.current?.seekTo) return;
    playerRef.current.seekTo(sec, true);
  };
  
  // Kaynakları çek
  useEffect(() => {
    fetch(`http://localhost:8000/video/resources/${videoId}`)
      .then((res) => res.json())
      .then((data) => setResources(data.resources || []))
      .catch((err) => console.error("Kaynaklar çekilirken hata oluştu:", err));
  }, [videoId]);

  // Yeni: Notları çek
  useEffect(() => {
    if (!sessionId) return;
    fetch(`http://localhost:8000/video/highlights/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setHighlights(data.highlights || []))
      .catch((err) => console.error("Notlar çekilirken hata oluştu:", err));
  }, [sessionId]);

  // Yeni: Not ekle
  const addHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !newHighlight.trim()) return;

    const t = Math.floor(playerRef.current?.getCurrentTime?.() || 0);
    fetch("http://localhost:8000/video/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, t_seconds: t, highlight_text: newHighlight.trim() }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.highlight) {
          setHighlights((prev) => [...prev, data.highlight]);
          setNewHighlight("");
        }
      })
      .catch((err) => console.error("Not eklenirken hata oluştu:", err));
  };
  
  // Aktif kaynakları hesapla
  const activeResources = resources.filter(r => currentTime >= r.start_seconds && currentTime < (r.end_seconds || Infinity));

  // Aktif chapter index’ini hesapla
  const activeIdx = (() => {
    if (!chapters.length) return -1;
    let idx = -1;
    for (let i = 0; i < chapters.length; i++) {
      const cur = chapters[i].start_seconds;
      const next = chapters[i + 1]?.start_seconds ?? Infinity;
      if (currentTime >= cur && currentTime < next) { idx = i; break; }
    }
    return idx;
  })();

  // Klavye ile chapter gezme (← →)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!chapters.length) return;
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, chapters, close]);

  // Saniyeyi mm:ss / hh:mm:ss formatla
  const fmt = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90" onClick={close}>
      <div className="flex w-full h-full" onClick={(e) => e.stopPropagation()}>
        {/* Sol Taraf: Video Player */}
        <div className="relative flex-1 w-full h-full">
          {/* Kapat: kırmızı X */}
          <button
            onClick={close}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-colors"
            aria-label="Kapat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          {/* Başlık */}
          <div className="absolute left-4 right-20 top-4 z-40 text-white/95 text-base font-semibold line-clamp-2">
            {title}
          </div>

          {/* Player (tam ekran) */}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {/* Chapters bar (altta) */}
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
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

          {/* Zaman Çizelgesi Bazlı Kaynak Önerisi */}
          {activeResources.length > 0 && (
            <div className="absolute top-20 right-4 z-40 w-80 p-4 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-zinc-200 text-zinc-900">
              <h4 className="text-sm font-bold mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                İlgili Kaynaklar
              </h4>
              <ul className="space-y-2">
                {activeResources.map((res) => (
                  <li key={res.id}>
                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="block text-sm p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors">
                      <span className="font-medium">{res.title}</span>
                      <span className="ml-2 text-xs text-zinc-500 uppercase">{res.type}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sağ Taraf: Copilot benzeri Not Alma Paneli */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] h-full bg-zinc-900 border-l border-zinc-700 flex flex-col p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold text-lg">İzleme Notları</h4>
            {/* Session yazısı kaldırıldı */}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-4 scrollbar-thin">
            {highlights.length > 0 ? (
              highlights.map((h) => (
                <div 
                  key={h.id} 
                  className="bg-zinc-800 p-3 rounded-lg cursor-pointer hover:bg-zinc-700 transition"
                  onClick={() => seekTo(h.t_seconds)}
                >
                  <div className="text-sm font-medium text-white line-clamp-3">{h.highlight_text}</div>
                  <div className="text-xs text-zinc-400 mt-1">{fmt(h.t_seconds)}</div>
                </div>
              ))
            ) : (
              <div className="text-zinc-500 text-center py-10">Henüz bir notun yok.</div>
            )}
          </div>
          
          <form onSubmit={addHighlight} className="mt-4 flex flex-col space-y-2">
            <textarea
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              className="w-full h-24 p-3 text-sm bg-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
      </div>
    </div>
  );
}