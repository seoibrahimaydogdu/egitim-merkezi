// src/utils/notes.ts
import { getClientId } from "./clientId";

// TypeScript için ImportMeta env tanımı
interface ImportMetaEnv {
  VITE_API_BASE?: string;
}

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

// ---- Tipler ----
export type VideoNote = {
  id: string;
  videoId: string;
  videoTitle?: string | null;
  at: number;          // saniye (yeni alan)
  timestamp: number;   // saniye (geriye dönük uyumluluk)
  text: string;
  createdAt: string;   // ISO
};

// Backend base URL (.env'den gelir; yoksa localhost)
const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

// ---- Backend satır -> Frontend tip dönüşümü ----
function rowToNote(row: any): VideoNote {
  if (!row) {
    return {
      id: "",
      videoId: "",
      videoTitle: null,
      at: 0,
      timestamp: 0,
      text: "",
      createdAt: "",
    };
  }

  const ts =
    typeof row.timestamp_seconds === "number"
      ? row.timestamp_seconds
      : typeof row.at === "number"
      ? row.at
      : 0;

  const text = row.note_text ?? row.text ?? "";

  return {
    id: row.id,
    videoId: row.video_id,
    videoTitle: row.video_title ?? null,
    at: ts,
    timestamp: ts, // eski UI için alias
    text,
    createdAt: row.created_at,
  };
}

// ---- NOT EKLE (backend) ----
export async function addNoteRemote(params: {
  videoId: string;
  videoTitle?: string | null;
  at: number; // saniye
  text: string;
}): Promise<VideoNote> {
  const res = await fetch(`${API_BASE}/video/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: getClientId(), // client bazlı kullanıcı
      video_id: params.videoId,
      video_title: params.videoTitle ?? null,
      timestamp_seconds: Math.max(0, Math.floor(params.at || 0)),
      note_text: params.text.trim(),
    }),
  });

  if (!res.ok) {
    const msg = await safeErr(res);
    throw new Error(`Not ekleme başarısız: ${msg}`);
  }

  const data = await res.json();

  // Dönen veriyi normalize et
  const row = Array.isArray(data) ? data[0]
            : Array.isArray(data?.data) ? data.data[0]
            : data.note ?? data;

  const note = rowToNote(row);

  // 🔔 UI taraflarını tetikle
  window.dispatchEvent(new Event("video_notes:update"));
  return note;
}

// ---- Belirli video için notlar ----
export async function getNotesByVideoRemote(videoId: string): Promise<VideoNote[]> {
  const res = await fetch(
    `${API_BASE}/video/notes/${encodeURIComponent(videoId)}?user_id=${encodeURIComponent(getClientId())}`
  );
  if (!res.ok) {
    const msg = await safeErr(res);
    throw new Error(`Notları çekerken hata: ${msg}`);
  }
  const data = await res.json();
  return (data.notes || data || []).map(rowToNote);
}

// ---- Kullanıcının tüm notları (Video Notlarım) ----
export async function loadAllNotesRemote(): Promise<VideoNote[]> {
  const res = await fetch(
    `${API_BASE}/video/notes-all?user_id=${encodeURIComponent(getClientId())}`
  );
  if (!res.ok) {
    const msg = await safeErr(res);
    throw new Error(`Tüm notlar yüklenemedi: ${msg}`);
  }
  const data = await res.json();
  return (data.notes || data || []).map(rowToNote);
}

// ---- Yardımcılar ----
async function safeErr(res: Response) {
  try {
    const j = await res.json();
    return j?.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

// UI'da süre gösterimi için (opsiyonel)
export function formatTime(s: number) {
  const sec = Math.max(0, Math.floor(s));
  const m = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}
