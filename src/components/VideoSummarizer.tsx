import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export type VideoSummarizerProps = {
  notes: string;
  videoId?: string;
};

const VideoSummarizer = ({ notes, videoId }: VideoSummarizerProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!notes) {
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSummary(null);
    setError(null);

    const getTranscript = async (id: string) => {
      // Gerçek bir uygulamada, burada YouTube Data API'yi kullanarak
      // videonun transkriptini almanız gerekir. Bu, sadece bir örnek API
      // çağrısıdır. Bu işlevi API'den transkript çekecek şekilde
      // değiştirmelisiniz.
      // DİKKAT: Bu kod, bir video transkripti almaz, sadece bir simülasyondur.
      // Gerçek bir senaryoda bu `transcript` verisi, bir API çağrısı ile elde edilir.
      const transcript = "Bu, video transkriptinin temsilidir. Gerçek bir senaryoda bu, videonun konuşmalarının tamamı olacaktır. SEO basics, technical SEO, content marketing, and link building are key topics. Analytics and tracking are also important for measuring success.";
      return transcript;
    };

    const fetchSummary = async () => {
      let attempts = 0;
      const maxAttempts = 3;
      let delay = 1000; // 1 saniye başlangıç gecikmesi

      while (attempts < maxAttempts) {
        try {
          // Örnek transkripti al
          const transcript = await getTranscript(notes);
          
          if (!transcript) {
            throw new Error("Transkript alınamadı.");
          }

          // Gemini API'yi kullanarak özeti oluştur
          const chatHistory = [{
            role: "user",
            parts: [{ text: `Aşağıdaki video transkriptini Türkçe olarak özetle:\n\n${transcript}` }],
          }];
          const payload = {
            contents: chatHistory,
          };
          const apiKey = "";
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`API hatası: ${response.statusText}`);
          }

          const result = await response.json();
          if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            setSummary(text);
            break; // Başarılı, döngüden çık
          } else {
            throw new Error("API'den geçerli bir yanıt alınamadı.");
          }
        } catch (err) {
          console.error("Özet oluşturulurken hata:", err);
          setError("Özet oluşturulurken bir hata oluştu.");
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Üstel geri çekilme (exponential backoff)
          }
        } finally {
          if (attempts >= maxAttempts) {
            setLoading(false);
          }
        }
      }
      setLoading(false);
    };

    fetchSummary();
  }, [notes]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm">Video özeti oluşturuluyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-red-500 dark:text-red-400">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Video Notlarım</h3>
      {summary ? (
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300">
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      ) : (
        <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg">
          Henüz bir not yok.
        </div>
      )}
    </div>
  );
};

export default VideoSummarizer;
