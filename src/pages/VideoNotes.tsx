// src/pages/VideoNotes.tsx
import { useEffect, useMemo, useState } from "react";
import { getClientId } from "../utils/clientId";
import { loadAllNotesRemote, type VideoNote } from "../utils/notes";

type Props = { onModalToggle?: (isOpen: boolean) => void };

export default function VideoNotes({ onModalToggle }: Props) {
  const userId = getClientId();
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setErr(null);
      const data = await loadAllNotesRemote();
      setNotes(data);
    } catch (e: any) {
      setErr(e?.message || "Notlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    onModalToggle?.(false);
    refresh();

    // Modal/diğer yerlerden not eklenince tetiklenen event
    const onUpdate = () => refresh();
    window.addEventListener("video_notes:update", onUpdate);
    return () => window.removeEventListener("video_notes:update", onUpdate);
  }, [onModalToggle]); // userId sabit (clientId) olduğu için deps'e eklemeye gerek yok

  const grouped = useMemo(() => {
    const m = new Map<string, VideoNote[]>();
    for (const n of notes) {
      const key = n.videoTitle || n.videoId;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(n);
    }
    return Array.from(m.entries());
  }, [notes]);

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold dark:text-white mb-6">Video Notlarım</h1>

      {loading && <p className="text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}
      {err && <p className="text-red-600 dark:text-red-400">{err}</p>}

      {!loading && !err && (notes.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">Henüz bir notun yok.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([group, items]) => (
            <div key={group} className="space-y-2">
              <h2 className="text-lg font-semibold dark:text-white">{group}</h2>
              <ul className="space-y-3">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="text-xs text-zinc-500 mb-1">{fmt(n.timestamp)}</div>
                    <div className="text-sm">{n.text}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
