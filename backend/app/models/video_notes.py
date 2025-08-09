# backend/app/models/video_notes.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NoteCreate(BaseModel):
    client_id: str = Field(..., min_length=1)
    video_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    timestamp_seconds: int = 0
    video_title: Optional[str] = None

class NoteOut(BaseModel):
    id: str
    client_id: str
    video_id: str
    video_title: Optional[str] = None
    timestamp_seconds: int
    text: str
    created_at: datetime
