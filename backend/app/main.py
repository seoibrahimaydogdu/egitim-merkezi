from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .youtube_service import search_videos, get_new_videos_for_query
from .supabase_client import supabase

# 🔌 Routers
from .routes import topics  # topics router'ını dahil et

app = FastAPI(title="SEO Eğitim Merkezi API")

# ---------------------------
#       CORS Ayarları
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Üretim ortamında (prod) kendi domaininizi buraya ekleyin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔗 Yönlendiricileri (routers) dahil et
app.include_router(topics.router)

def qkey(s: str) -> str:
    """Sorgu anahtarını oluşturmak için metni temizle ve küçük harfe dönüştür."""
    return (s or "").strip().lower()

# ---------------------------
#       Videolarla İlgili Uç Noktalar
# ---------------------------
@app.get("/videos")
def get_videos(
    query: str,
    language: str = "tr",
    max_results: int = 9,
    order: str = "relevance",
    page_token: Optional[str] = None,
    fresh: bool = False,
):
    """
    fresh=True ise: YouTube'dan yeni videoları çeker, cache'e yazar ve döndürür.
    fresh=False ise: Önce YouTube'dan yeni veriyi çeker, cache'e yazar, sonra cache'ten döndürür.
    """
    if fresh:
        return search_videos(query, language, max_results, order, page_token, fresh=True)

    # 1) Önce taze veriyi getir ve cache'e yaz
    fresh_data = search_videos(query, language, max_results, order, page_token, fresh=True)
    items = fresh_data.get("items", fresh_data.get("results", []))
    if items:
        rows = []
        qk = qkey(query)
        for it in items:
            rows.append({
                "video_id": it["video_id"],
                "title": it.get("title"),
                "description": it.get("description"),
                "thumbnail": it.get("thumbnail"),
                "published_at": it.get("published_at"),
                "channel_title": it.get("channel_title"),
                "channel_id": it.get("channel_id"),
                "channel_thumbnail": it.get("channel_thumbnail"),
                "duration": it.get("duration"),
                "query_key": qk,
                "query": query,
                "chapters": it.get("chapters"),
            })
        supabase.table("videos").upsert(rows, on_conflict="video_id").execute()

    # 2) Cache'ten çek
    cached = (
        supabase.table("videos")
        .select("*")
        .eq("query_key", qkey(query))
        .order("published_at", desc=True)
        .limit(max_results)
        .execute()
    )
    return {"items": cached.data, "nextPageToken": None}


@app.get("/new_videos")
def get_new_videos(query: str, last_checked_at: str):
    """Son kontrol tarihinden sonra eklenen yeni videoları getirir."""
    return {"items": get_new_videos_for_query(query, last_checked_at)}

# ---------------------------
#   Kullanıcı Sorgusu Kontrolü
# ---------------------------
@app.get("/query-check/last")
def get_last_check(user_id: str = Query(...), query: str = Query(...)):
    """Bir kullanıcının belirli bir sorguyu en son ne zaman kontrol ettiğini getirir."""
    try:
        r = (
            supabase.table("user_query_checks")
            .select("last_checked_at")
            .eq("user_id", user_id)
            .eq("query_key", qkey(query))
            .single()
            .execute()
        )
        return {"last_checked_at": (r.data or {}).get("last_checked_at")}
    except Exception:
        return {"last_checked_at": None}

@app.post("/query-check/set")
def set_last_check(user_id: str = Query(...), query: str = Query(...)):
    """Bir kullanıcının belirli bir sorgu için son kontrol zamanını günceller."""
    try:
        payload = {
            "user_id": user_id,
            "query_key": qkey(query),
            "last_checked_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("user_query_checks").upsert(payload, on_conflict="user_id,query_key").execute()
        return {"ok": True, "last_checked_at": payload["last_checked_at"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------
#       Favoriler
# ---------------------------
@app.get("/favorites")
def list_favorites(user_id: str):
    """Bir kullanıcının tüm favori videolarını listeler."""
    data = (
        supabase.table("user_favorites")
        .select("*")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    return {"items": data}

@app.post("/favorites")
def add_favorite(user_id: str, video_id: str, query: str = ""):
    """Bir videoyu favorilere ekler."""
    supabase.table("user_favorites").upsert(
        {"user_id": user_id, "video_id": video_id, "query": query},
        on_conflict="user_id,video_id",
    ).execute()
    return {"ok": True}

@app.delete("/favorites")
def remove_favorite(user_id: str, video_id: str):
    """Bir videoyu favorilerden kaldırır."""
    supabase.table("user_favorites").delete().eq("user_id", user_id).eq("video_id", video_id).execute()
    return {"ok": True}

@app.get("/favorites/detail")
def favorites_detail(user_id: str):
    """Kullanıcının favori videolarının detaylarını getirir."""
    favs = (
        supabase.table("user_favorites")
        .select("video_id")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    ids = [f["video_id"] for f in favs]
    if not ids:
        return {"items": []}

    vids = (
        supabase.table("videos")
        .select("*")
        .in_("video_id", ids)
        .execute()
        .data
    )

    order_map = {vid: i for i, vid in enumerate(ids)}
    vids.sort(key=lambda x: order_map.get(x["video_id"], 10**9))

    return {"items": vids}

# ---------------------------
#       Kaynaklar
# ---------------------------
@app.get("/video/resources/{video_id}")
def get_video_resources(video_id: str):
    """Bir videoyla ilişkili kaynakları getirir."""
    try:
        response = supabase.table("video_resources").select("*").eq("video_id", video_id).order("start_seconds").execute()
        return {"resources": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------
#   İzleme Analizi
# ---------------------------
class VideoSessionStart(BaseModel):
    user_id: str
    video_id: str
    query: str

class VideoPing(BaseModel):
    session_id: str
    t_seconds: int
    event: str

class VideoSessionEnd(BaseModel):
    session_id: str

@app.post("/video/session/start")
def start_video_session(session_data: VideoSessionStart):
    """Bir video izleme oturumunu başlatır."""
    try:
        response = supabase.table("video_sessions").insert({
            "user_id": session_data.user_id,
            "video_id": session_data.video_id,
            "query": session_data.query,
        }).execute()
        session_id = response.data[0]["id"] if response.data else None
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video/ping")
def ping_video_session(ping_data: VideoPing):
    """Bir video izleme oturumunda ping olayı kaydeder."""
    try:
        supabase.table("video_pings").insert(
            {"session_id": ping_data.session_id, "t_seconds": ping_data.t_seconds, "event": ping_data.event}
        ).execute()
        supabase.table("video_sessions").update({
            "last_ping_time": datetime.now(timezone.utc).isoformat(),
            "last_t_seconds": ping_data.t_seconds,
        }).eq("id", ping_data.session_id).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video/session/end")
def end_video_session(end_data: VideoSessionEnd):
    """Bir video izleme oturumunu sonlandırır."""
    try:
        supabase.table("video_sessions").update({
            "ended_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", end_data.session_id).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/heatmap")
def video_heatmap(video_id: str):
    """Bir video için izleme yoğunluğu (heatmap) verilerini getirir."""
    data = (
        supabase.table("video_heatmap")
        .select("*")
        .eq("video_id", video_id)
        .order("bucket_10s", desc=False)
        .execute()
        .data
    )
    return {"items": data}

# ---------------------------
#    Vurgular (Highlights)
# ---------------------------
class Highlight(BaseModel):
    session_id: str
    t_seconds: int
    highlight_text: str

@app.post("/video/highlights")
def add_video_highlight(highlight_data: Highlight):
    """Bir videoya vurgu ekler."""
    try:
        response = supabase.table("video_highlights").insert({
            "session_id": highlight_data.session_id,
            "t_seconds": highlight_data.t_seconds,
            "highlight_text": highlight_data.highlight_text,
        }).execute()
        return {"highlight": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/highlights/{session_id}")
def get_video_highlights(session_id: str):
    """Bir oturuma ait vurguları getirir."""
    try:
        response = supabase.table("video_highlights").select("*").eq("session_id", session_id).order("t_seconds").execute()
        return {"highlights": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------
#       Notlar
# ---------------------------
class VideoNote(BaseModel):
  user_id: str
  video_id: str
  video_title: Optional[str] = None
  timestamp_seconds: int = 0
  note_text: str

@app.post("/video/notes")
def add_video_note(note: VideoNote):
    """Bir videoya not ekler."""
    try:
        res = supabase.table("video_notes").insert({
            "user_id": note.user_id,
            "video_id": note.video_id,
            "video_title": note.video_title,
            "timestamp_seconds": note.timestamp_seconds,
            "note_text": note.note_text.strip(),
        }).execute()
        return {"note": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/notes/{video_id}")
def get_notes_for_video(user_id: str, video_id: str):
    """Bir kullanıcıya ait belirli bir videonun notlarını getirir."""
    try:
        res = supabase.table("video_notes").select("*").eq("user_id", user_id).eq("video_id", video_id).order("created_at", desc=True).execute()
        return {"notes": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/notes-all")
def get_all_notes(user_id: str):
    """Bir kullanıcıya ait tüm notları getirir."""
    try:
        res = supabase.table("video_notes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"notes": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------
#       Sağlık Kontrolü
# ---------------------------
@app.get("/health")
def health():
    """Uygulamanın çalışıp çalışmadığını kontrol eder."""
    return {"ok": True}
