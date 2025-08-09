import React, { useEffect, useState } from "react";
import { getClientId } from "../utils/clientId";
import ModalPlayer from "../components/ModalPlayer";
import VideoSummarizer from "../components/VideoSummarizer";

type Video = {
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  published_at: string;
  channel_title: string;
  channel_id: string;
  channel_thumbnail?: string;
  duration?: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
  });
}

const Skeleton = () => (
  <div className="rounded-2xl bg-white/60 dark:bg-zinc-800/60 backdrop-blur border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden animate-pulse">
    <div className="h-40 bg-zinc-200 dark:bg-zinc-700" />
    <div className="p-4 space-y-3">
      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded" />
    </div>
  </div>
);

export default function Favorites({ onModalToggle }: { onModalToggle: (isOpen: boolean) => void }) {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedLink, setSharedLink] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  
  const uid = getClientId();

  const fetchFavorites = () => {
    setLoading(true);
    fetch(`http://localhost:8000/favorites/detail?user_id=${uid}`)
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(err => {
        console.error("Favori videolar çekilirken hata oluştu:", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const removeFav = async (videoId: string) => {
    try {
      await fetch(`http://localhost:8000/favorites?user_id=${uid}&video_id=${videoId}`, { method: "DELETE" });
      setItems(prevItems => prevItems.filter(v => v.video_id !== videoId));
    } catch (err) {
      console.error("Favori kaldırma hatası:", err);
    }
  };
  
  const handleShare = async () => {
    if (items.length === 0) {
      console.log("Paylaşılacak favori video bulunmamaktadır.");
      return;
    }
    setIsSharing(true);
    const title = "Favori Video Listem";
    try {
      const response = await fetch('http://localhost:8000/share/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, title }),
      });

      if (!response.ok) {
        throw new Error('Paylaşım linki oluşturulamadı.');
      }

      const data = await response.json();
      setSharedLink(data.share_link);
      await navigator.clipboard.writeText(data.share_link);
      console.log("Paylaşım linki oluşturuldu ve panoya kopyalandı!");
    } catch (error) {
      console.error("Paylaşım hatası:", error);
      alert("Paylaşım linki oluşturulurken bir hata oluştu.");
    } finally {
      setIsSharing(false);
    }
  };

  const openModal = (video: Video) => {
    setSelectedVideoId(video.video_id);
    setIsModalOpen(true);
    onModalToggle(true);
  };
  
  const closeModal = () => {
    setSelectedVideoId(null);
    setIsModalOpen(false);
    onModalToggle(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 dark:bg-zinc-900">
      
      {!isModalOpen && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold dark:text-white">Beğendiklerim</h1>
            <div className="flex gap-2">
              <button 
                onClick={fetchFavorites} 
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:opacity-90 dark:bg-zinc-700 dark:hover:opacity-80"
              >
                Yenile
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing || items.length === 0}
                className="px-4 py-1.5 rounded-lg bg-blue-500 text-white shadow hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {isSharing ? 'Oluşturuluyor...' : 'Paylaş'}
              </button>
            </div>
          </div>
          
          {sharedLink && (
            <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 rounded-lg break-words">
              <p className="font-semibold mb-1">Paylaşım Linki (Panoya Kopyalandı):</p>
              <a href={sharedLink} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-300">
                {sharedLink}
              </a>
            </div>
          )}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">Henüz beğendiğin video yok.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(v => (
                <div key={v.video_id} className="rounded-2xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-xl transition overflow-hidden">
                  <div className="relative aspect-video cursor-pointer group" onClick={() => openModal(v)}>
                    <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute right-3 top-3 text-xs px-2 py-1 rounded bg-black/70 text-white pointer-events-none">
                      {v.duration || "Video"}
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeFav(v.video_id); }}
                      className="absolute left-3 top-3 z-20 w-10 h-10 flex items-center justify-center rounded-full border bg-white shadow-sm text-red-500 border-red-200 ring-1 ring-red-200 hover:scale-110 transition dark:bg-zinc-700 dark:border-red-500 dark:ring-red-500"
                      title="Beğenilerden kaldır"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21.35z"/>
                      </svg>
                    </button>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                        {/(beginner|intro)/i.test(v.title + v.description) ? "beginner" : "intermediate"}
                      </span>
                    </div>

                    <h3 className="font-semibold text-zinc-900 dark:text-white leading-snug line-clamp-2" title={v.title}>{v.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{v.description}</p>

                    <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                      <span>⏱ {formatDate(v.published_at)}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        {v.channel_thumbnail ? (
                          <img src={v.channel_thumbnail} alt={v.channel_title} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        ) : null}
                        <span className="truncate max-w-[140px]">{v.channel_title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && selectedVideoId && (
        <ModalPlayer
          videoId={selectedVideoId}
          onClose={closeModal}
        >
          <VideoSummarizer videoId={selectedVideoId} />
        </ModalPlayer>
      )}
    </div>
  );
}