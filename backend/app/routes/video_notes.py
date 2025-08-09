# backend/app/routes/video_notes.py
from fastapi import APIRouter, HTTPException, Query
from typing import List
from backend.app.models.video_notes import NoteCreate, NoteOut
from backend.app.repositories.video_notes_repo import (
    insert_note, get_notes_by_video, get_all_notes, delete_note,
)

router = APIRouter(prefix="/notes", tags=["video_notes"])

@router.post("", response_model=NoteOut)
def add_video_note(payload: NoteCreate):
    try:
        row = insert_note(
            client_id=payload.client_id,
            video_id=payload.video_id,
            text=payload.text,
            timestamp_seconds=payload.timestamp_seconds,
            video_title=payload.video_title,
        )
        return row
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[NoteOut])
def list_all_notes(client_id: str = Query(..., min_length=1)):
    try:
        return get_all_notes(client_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/by-video", response_model=List[NoteOut])
def list_notes_by_video(
    client_id: str = Query(..., min_length=1),
    video_id: str = Query(..., min_length=1),
):
    try:
        return get_notes_by_video(client_id, video_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{note_id}")
def remove_note(note_id: str, client_id: str = Query(..., min_length=1)):
    try:
        delete_note(note_id, client_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
