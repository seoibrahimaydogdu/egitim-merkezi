import React, { useEffect, useState } from "react";
import { getClientId } from "../utils/clientId";
import ModalPlayer from "./ModalPlayer";

type Chapter = { start_seconds: number; title: string };

interface Video {
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  published_at: string;
  channel_title: string;
  channel_thumbnail?: string; // logo (opsiyonel)
  duration?: string;
  chapters?: Chapter[]; // ✅ chapters eklendi
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const SkeletonCard = () => (
  <div className="rounded-2xl bg-white/60 backdrop-blur border border-zinc-200 shadow-sm overflow-hidden animate-pulse">
    <div className="h-40 bg-zinc-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 w-3/4 bg-zinc-200 rounded" />
      <div className="h-3 w-full bg-zinc-200 rounded" />
      <div className="h-3 w-5/6 bg-zinc-200 rounded" />
    </div>
  </div>
);

const EmptyState = ({ q }: { q: string }) => (
  <div className="col-span-full text-center py-16">
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 shadow">🔎</div>
    <h3 className="mt-4 text-xl font-semibold text-zinc-900">No results</h3>
    <p className="text-zinc-500">We couldn’t find videos for “{q}”. Try another search.</p>
  </div>
);

const VideoList: React.FC<{
  query: string;
  language?: string;
  category?: string;
  order?: string;
}> = ({ query, language = "en", category = "all", order = "relevance" }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [active, setActive] = useState<Video | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favs, setFavs] = useState<Record<string, boolean>>({});

  const buildUrl = (pageToken?: string, fresh?: boolean) =>
    `http://localhost:8000/videos?query=${encodeURIComponent(query)}&language=${language}&order=${order}&max_results=12${
      pageToken ? `&page_token=${pageToken}` : ""
    }${fresh ? `&fresh=true` : ""}`;

  const fetchVideos = (append = false, pageToken?: string, fresh?: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    fetch(buildUrl(pageToken, fresh))
      .then((r) => r.json())
      .then((d) => {
        const items: Video[] = d.items || d.results || [];
        setVideos((prev) => (append ? [...prev, ...items] : items));
        setNextPageToken(d.nextPageToken || null);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  const refresh = () => {
    setNextPageToken(null);
    fetchVideos(false, undefined, true);
  };

  useEffect(() => {
    const uid = getClientId();
    fetch(`http://localhost:8000/favorites?user_id=${uid}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, boolean> = {};
        (d.items || []).forEach((row: any) => (map[row.video_id] = true));
        setFavs(map);
      })
      .catch(() => {});
  }, []);

  const toggleFav = (video: Video) => {
    const uid = getClientId();
    const isFav = !!favs[video.video_id];

    if (isFav) {
      fetch(`http://localhost:8000/favorites?user_id=${uid}&video_id=${video.video_id}`, {
        method: "DELETE",
      }).then(() => setFavs((prev) => ({ ...prev, [video.video_id]: false })));
    } else {
      fetch(
        `http://localhost:8000/favorites?user_id=${uid}&video_id=${video.video_id}&query=${encodeURIComponent(
          query
        )}`,
        { method: "POST" }
      ).then(() => setFavs((prev) => ({ ...prev, [video.video_id]: true })));
    }
  };

  useEffect(() => {
    setVideos([]);
    setNextPageToken(null);
    fetchVideos(false);
  }, [query, language, order]);

  const shown = videos.filter((v) => {
    if (category === "all") return true;
    if (category === "basics") return /beginner|basics|intro/i.test(v.title + " " + v.description);
    if (category === "technical")
      return /technical|site|crawl|page speed|core web/i.test(v.title + " " + v.description);
    if (category === "content") return /content|copy|writing|topic/i.test(v.title + " " + v.description);
    if (category === "link") return /link|backlink|outreach/i.test(v.title + " " + v.description);
    if (category === "analytics") return /analytics|ga4|tracking|tag/i.test(v.title + " " + v.description);
    return true;
  });

  const Card = ({ v }: { v: Video }) => (
    <div className="rounded-2xl bg-white/70 backdrop-blur border border-zinc-200 shadow-sm hover:shadow-xl transition overflow-hidden">
      {/* Thumbnail + Play */}
      <div
        className="relative aspect-video cursor-pointer group"
        onClick={() => setActive(v)}
      >
        <img
          src={v.thumbnail}
          alt={v.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Overlay: tıklamayı engellemesin */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Süre: tıklamayı engellemesin */}
        <div className="absolute right-3 top-3 text-xs px-2 py-1 rounded bg-black/70 text-white pointer-events-none">
          {v.duration || "Video"}
        </div>

        {/* Favori: en üstte ve tıklanabilir */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFav(v);
            // Pulse animasyonu
            const btn = e.currentTarget as HTMLButtonElement;
            btn.classList.remove("pulse-anim");
            void btn.offsetWidth;
            btn.classList.add("pulse-anim");
            setTimeout(() => btn.classList.remove("pulse-anim"), 320);
          }}
          aria-label={favs[v.video_id] ? "Favorilerden kaldır" : "Favoriye ekle"}
          title={favs[v.video_id] ? "Favorilerden kaldır" : "Favoriye ekle"}
          className={`absolute left-3 top-3 z-20 w-10 h-10 flex items-center justify-center rounded-full border bg-white shadow-sm pointer-events-auto transition-transform ${
            favs[v.video_id]
              ? "border-red-200 ring-1 ring-red-200 hover:scale-110"
              : "border-gray-300 hover:scale-110"
          }`}
        >
          {/* svg kalp */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${favs[v.video_id] ? "text-red-500" : "text-gray-400"}`}
            fill={favs[v.video_id] ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21.35z" />
          </svg>
        </button>

        {/* Play ikon overlay: sadece görsel */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-white shadow p-4 transition-transform duration-300 group-hover:scale-110">
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: "10px solid transparent",
                borderBottom: "10px solid transparent",
                borderLeft: "16px solid #ef4444",
              }}
            />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {/(beginner|intro)/i.test(v.title + v.description) ? "beginner" : "intermediate"}
          </span>
        </div>

        <h3
          className="font-semibold text-zinc-900 leading-snug"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          title={v.title}
        >
          {v.title}
        </h3>

        <p
          className="mt-1 text-sm text-zinc-600"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {v.description}
        </p>

        {/* Logo + Kanal adı */}
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>⏱ {formatDate(v.published_at)}</span>
          <div className="flex items-center gap-2 min-w-0">
            {v.channel_thumbnail ? (
              <img
                src={v.channel_thumbnail}
                alt={v.channel_title}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                loading="lazy"
              />
            ) : null}
            <span className="truncate max-w-[140px]">{v.channel_title}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-zinc-500">
          Results for <strong>{query}</strong>
        </div>
        <button onClick={refresh} className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:opacity-90">
          Yenile (cache bypass)
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          : shown.length === 0
          ? <EmptyState q={query} />
          : shown.map((v) => <Card key={v.video_id} v={v} />)}
      </div>

      {!loading && nextPageToken && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchVideos(true, nextPageToken!)}
            disabled={loadingMore}
            className="px-5 py-2 rounded-xl bg-zinc-900 text-white hover:opacity-90 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {active && (
        <ModalPlayer
          videoId={active.video_id}
          title={active.title}
          query={query}
          chapters={(active as any).chapters || []}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
};

export default VideoList;