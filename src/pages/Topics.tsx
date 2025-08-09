import React, { useEffect, useState, useMemo } from "react";
import { supabase } from '../utils/supabaseClient';
import { useEducationCenter } from './EducationCenter'; // EducationCenter'dan context'i çekmek için

// Notlar için yeni bir tip tanımlayalım
type VideoNote = {
  id: number;
  user_id: string;
  video_id: string;
  note_text: string;
  created_at: string;
  topic: string; // Notun ait olduğu konu
};

// Bu bileşen, EducationCenter'dan props alacak
type TopicsProps = {
  followedTopics: string[];
  user: any;
};

export default function Topics({ followedTopics, user }: TopicsProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]); // Notları tutmak için yeni state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notların hangi video ile ilişkili olduğunu anlamak için EducationCenter'dan videoları çekelim
  const { videos } = useEducationCenter();
  const videoMap = useMemo(() => {
    const map = new Map();
    videos.forEach(video => {
      map.set(video.video_id, video);
    });
    return map;
  }, [videos]);

  useEffect(() => {
    const fetchNotes = async () => {
      setError(null);
      // Eğer kullanıcı yoksa veya takip edilen konu yoksa not çekmeye gerek yok
      if (!user || followedTopics.length === 0) {
        setNotes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data: notesData, error: notesError } = await supabase
        .from('video_notes') // Notlarınızı tutan tablonuz
        .select('*') // Tüm notları seçiyoruz
        .eq('user_id', user.id) // Sadece bu kullanıcının notlarını
        .in('topic', followedTopics); // Sadece takip edilen konulara ait olanları
      
      if (notesError) {
        console.error("Notlar çekilirken hata:", notesError);
        setError("Notlar yüklenirken bir hata oluştu.");
        setNotes([]);
      } else {
        setNotes(notesData || []);
      }
      setLoading(false);
    };

    fetchNotes();
  }, [user, followedTopics]); // user veya followedTopics değiştiğinde notları yeniden çek

  return (
    <div className="p-6 text-zinc-500 dark:text-zinc-400 space-y-4">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center">Notlar yükleniyor...</div>
      ) : notes.length > 0 ? (
        notes.map((note) => {
          const video = videoMap.get(note.video_id);
          return (
            <div key={note.id} className="p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-800 transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/60 dark:text-blue-200 dark:border-blue-700">
                  {note.topic}
                </p>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(note.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 text-zinc-900 dark:text-zinc-50">{note.note_text}</p>
              {video && (
                <a 
                  href={`#video-${note.video_id}`}
                  className="text-sm text-blue-600 hover:underline mt-2 inline-block dark:text-blue-400"
                >
                  Video'ya Git: {video.title}
                </a>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center">Takip ettiğiniz konulara ait bir kayıt bulunamadı.</div>
      )}
    </div>
  );
}
