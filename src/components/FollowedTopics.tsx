import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Props
 * - userId: ZORUNLU – kimin konuları listelenecek
 * - channelId: Opsiyonel – gönderirseniz backend NULL + eşleşen channel_id'leri döndürüyor (main.py/topics.py ile uyumlu)
 * - onLoaded: Liste ilk yüklendiğinde size geri bildirim (konu sayısı gibi)
 * - onChange: Takip et/çıkar sonrası güncel listeyi dışarıya bildirmek için
 * - className: Dış sarmalayıcıya ekstra sınıf
 */
type FollowedTopicsProps = {
  userId: string;
  channelId?: string | null;
  onLoaded?: (topics: string[]) => void;
  onChange?: (topics: string[]) => void;
  className?: string;
};

/** Küçük yardımcı: uniq + trim */
const normalizeTopics = (arr: string[]) =>
  Array.from(
    new Set(
      (arr || [])
        .map((t) => (t ?? "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

/** İsteğe bağlı: basit bekleme (retry/backoff için) */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function FollowedTopics({
  userId,
  channelId = undefined,
  onLoaded,
  onChange,
  className = "",
}: FollowedTopicsProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState(""); // yerel arama filtresi
  const [busyTopic, setBusyTopic] = useState<string | null>(null); // tek tek optimistik silme işlemleri için
  const abortRef = useRef<AbortController | null>(null);

  /** --------- Fetcher (retry'li ve abort'lu) --------- */
  const fetchTopics = useCallback(
    async (withRetry = true) => {
      if (!userId) return;
      setLoading(true);
      setErr(null);
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const url = new URL("http://localhost:8000/subscribe/topics");
      url.searchParams.set("user_id", userId);
      if (channelId) url.searchParams.set("channel_id", channelId);

      try {
        const res = await fetch(url.toString(), { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = normalizeTopics(data?.topics || []);
        setTopics(list);
        onLoaded?.(list);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        if (withRetry) {
          // hafif retry/backoff
          await wait(350);
          return fetchTopics(false);
        }
        setErr(e?.message || "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    },
    [userId, channelId, onLoaded]
  );

  useEffect(() => {
    fetchTopics();
    return () => abortRef.current?.abort();
  }, [fetchTopics]);

  /** --------- Unfollow (optimistik) --------- */
  const handleUnfollow = useCallback(
    async (topic: string) => {
      if (!userId || !topic) return;
      setBusyTopic(topic);
      // optimistik
      const prev = topics;
      const next = prev.filter((t) => t !== topic);
      setTopics(next);
      onChange?.(next);

      try {
        await fetch("http://localhost:8000/subscribe/topics/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, topic, channel_id: channelId || undefined }),
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
        });
      } catch (e) {
        // geri al
        setTopics(prev);
        onChange?.(prev);
        console.error("Konu takibi bırakılırken hata:", e);
      } finally {
        setBusyTopic(null);
      }
    },
    [topics, userId, channelId, onChange]
  );

  /** --------- Arama filtresi --------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) => t.toLowerCase().includes(q));
  }, [topics, query]);

  /** --------- UI --------- */
  return (
    <div className={`w-full ${className}`}>
      {/* Başlık + arama */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold dark:text-white">Takip Ettiğim Konular</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Konularda ara…"
          className="px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Hata */}
      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Konular yüklenemedi: {err}{" "}
          <button
            onClick={() => fetchTopics()}
            className="ml-2 underline hover:opacity-80"
            title="Yeniden dene"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Yükleniyor (skeleton) */}
      {loading && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-36 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      )}

      {/* Liste */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filtered.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
            >
              {topic}
              <button
                disabled={busyTopic === topic}
                onClick={() => handleUnfollow(topic)}
                className={`text-xs rounded-full px-1.5 py-0.5 transition ${
                  busyTopic === topic
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-blue-200/60 dark:hover:bg-blue-800/60"
                }`}
                title="Takibi bırak"
                aria-label={`${topic} konusunu takibi bırak`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Boş durum */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {topics.length === 0
            ? "Henüz takip ettiğin bir konu yok."
            : "Filtreye uyan konu bulunamadı."}
        </div>
      )}
    </div>
  );
}
