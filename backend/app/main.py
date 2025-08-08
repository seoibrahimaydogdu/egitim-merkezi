from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .youtube_service import search_videos, get_new_videos_for_query
from .supabase_client import supabase

app = FastAPI(title="SEO Eğitim Merkezi API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # prod'da domainini koy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
#       VIDEOS
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
    YouTube araması. fresh=True => cache bypass.
    """
    return search_videos(query, language, max_results, order, page_token, fresh)

@app.get("/new_videos")
def get_new_videos(query: str, last_checked_at: str):
    return {"items": get_new_videos_for_query(query, last_checked_at)}


# ---------------------------
#       FAVORITES
# ---------------------------
@app.get("/favorites")
def list_favorites(user_id: str):
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
    supabase.table("user_favorites").upsert(
        {"user_id": user_id, "video_id": video_id, "query": query},
        on_conflict="user_id,video_id",
    ).execute()
    return {"ok": True}


@app.delete("/favorites")
def remove_favorite(user_id: str, video_id: str):
    supabase.table("user_favorites").delete().eq("user_id", user_id).eq("video_id", video_id).execute()
    return {"ok": True}


# ---> Beğeniler için DETAYLI liste (video bilgileriyle)
@app.get("/favorites/detail")
def favorites_detail(user_id: str):
    # önce kullanıcının favori video_id'lerini çek
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

    # ardından videos tablosundan detayları topla
    vids = (
        supabase.table("videos")
        .select("*")
        .in_("video_id", ids)
        .execute()
        .data
    )

    # orijinal favori sırasını koru
    order_map = {vid: i for i, vid in enumerate(ids)}
    vids.sort(key=lambda x: order_map.get(x["video_id"], 10**9))

    return {"items": vids}

# ---------------------------
#       RESOURCES
# ---------------------------
@app.get("/video/resources/{video_id}")
def get_video_resources(video_id: str):
    try:
        response = supabase.table("video_resources").select("*").eq("video_id", video_id).order("start_seconds").execute()
        return {"resources": response.data}
    except Exception as e:
        return {"error": str(e)}, 500


# ---------------------------
#     WATCH ANALYTICS
# ---------------------------

# Pydantic modelleri
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
    try:
        response = supabase.table("video_sessions").insert({
            "user_id": session_data.user_id,
            "video_id": session_data.video_id,
            "query": session_data.query,
        }).execute()
        
        session_id = response.data[0]["id"] if response.data else None
        return {"session_id": session_id}
    except Exception as e:
        return {"error": str(e)}, 500


@app.post("/video/ping")
def ping_video_session(ping_data: VideoPing):
    try:
        # Pings tablosuna olayı kaydet
        supabase.table("video_pings").insert(
            {"session_id": ping_data.session_id, "t_seconds": ping_data.t_seconds, "event": ping_data.event}
        ).execute()

        # Session tablosunu güncelle (last_t_seconds ve last_ping_time)
        supabase.table("video_sessions").update({
            "last_ping_time": datetime.now(timezone.utc).isoformat(),
            "last_t_seconds": ping_data.t_seconds,
        }).eq("id", ping_data.session_id).execute()

        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}, 500


@app.post("/video/session/end")
def end_video_session(end_data: VideoSessionEnd):
    try:
        supabase.table("video_sessions").update({
            "ended_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", end_data.session_id).execute()

        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/video/heatmap")
def video_heatmap(video_id: str):
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
#     HIGHLIGHTS (YENİ)
# ---------------------------

class Highlight(BaseModel):
    session_id: str
    t_seconds: int
    highlight_text: str

@app.post("/video/highlights")
def add_video_highlight(highlight_data: Highlight):
    """
    Bir izleme oturumuna yeni not ekler.
    """
    try:
        response = supabase.table("video_highlights").insert({
            "session_id": highlight_data.session_id,
            "t_seconds": highlight_data.t_seconds,
            "highlight_text": highlight_data.highlight_text,
        }).execute()
        return {"highlight": response.data[0]}
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/video/highlights/{session_id}")
def get_video_highlights(session_id: str):
    """
    Belirli bir izleme oturumunun tüm notlarını çeker.
    """
    try:
        response = supabase.table("video_highlights").select("*").eq("session_id", session_id).order("t_seconds").execute()
        return {"highlights": response.data}
    except Exception as e:
        return {"error": str(e)}, 500

# ---------------------------
#       HEALTHCHECK
# ---------------------------
@app.get("/health")
def health():
    return {"ok": True}