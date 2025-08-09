# backend/app/repositories/video_notes_repo.py
from typing import List, Dict, Any
from backend.app.supabase_client import supabase

TABLE = "video_notes"

def insert_note(
    client_id: str,
    video_id: str,
    text: str,
    timestamp_seconds: int = 0,
    video_title: str | None = None,
) -> Dict[str, Any]:
    payload = {
        "client_id": client_id,
        "video_id": video_id,
        "video_title": video_title,
        "timestamp_seconds": max(0, int(timestamp_seconds)),
        "text": text.strip(),
    }
    res = supabase.table(TABLE).insert(payload).select("*").execute()
    if res.error:
        raise RuntimeError(res.error)
    return res.data[0]

def get_notes_by_video(client_id: str, video_id: str) -> List[Dict[str, Any]]:
    res = (
        supabase.table(TABLE)
        .select("*")
        .eq("client_id", client_id)
        .eq("video_id", video_id)
        .order("created_at", desc=True)
        .execute()
    )
    if res.error:
        raise RuntimeError(res.error)
    return res.data or []

def get_all_notes(client_id: str) -> List[Dict[str, Any]]:
    res = (
        supabase.table(TABLE)
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", desc=True)
        .execute()
    )
    if res.error:
        raise RuntimeError(res.error)
    return res.data or []

def delete_note(note_id: str, client_id: str) -> int:
    res = (
        supabase.table(TABLE)
        .delete()
        .eq("id", note_id)
        .eq("client_id", client_id)
        .execute()
    )
    if res.error:
        raise RuntimeError(res.error)
    # Supabase python client delete dönüşü garip olabiliyor; etkilenen satır sayısı yoksa 1 varsayma.
    return 1
