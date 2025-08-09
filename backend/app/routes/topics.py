from typing import Optional, Set

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..supabase_client import supabase

router = APIRouter(prefix="/subscribe", tags=["topics"])


class TopicSubscribe(BaseModel):
    user_id: str
    topic: str
    channel_id: Optional[str] = None


@router.get("/topics")
def list_topics(user_id: str = Query(...), channel_id: Optional[str] = None):
    """
    Kullanıcının takip ettiği konuları döner.
    channel_id verilirse: channel_id IS NULL OLANLAR + eşleşen channel_id birlikte gelir.
    """
    try:
        q = supabase.table("user_topics").select("*").eq("user_id", user_id)

        if channel_id:
            # NULL kanal veya eşleşen channel_id
            q = q.or_(f"channel_id.is.null,channel_id.eq.{channel_id}")

        resp = q.order("created_at", desc=True).execute()
        data = resp.data or []

        topics: Set[str] = {
            (row.get("topic") or "").strip()
            for row in data
            if row.get("topic")
        }
        return {"topics": sorted(topics)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/topics")
def subscribe_topic(payload: TopicSubscribe):
    """
    Konu ekle (idempotent). Aynı (user_id, topic) varsa günceller/atlar.
    """
    try:
        supabase.table("user_topics").upsert(
            {
                "user_id": payload.user_id,
                "channel_id": payload.channel_id,
                "topic": payload.topic.strip(),
            },
            on_conflict="user_id,topic",  # Unique index şart
        ).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/topics/unsubscribe")
def unsubscribe_topic(payload: TopicSubscribe):
    """
    Konu takibini bırakır. channel_id verilirse ona göre de daraltır.
    """
    try:
        q = (
            supabase.table("user_topics")
            .delete()
            .eq("user_id", payload.user_id)
            .eq("topic", payload.topic.strip())
        )

        if payload.channel_id:
            q = q.eq("channel_id", payload.channel_id)

        q.execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
