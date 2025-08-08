import os
import requests
from dotenv import load_dotenv
from .supabase_client import supabase
import re
from datetime import datetime, timedelta, timezone

load_dotenv()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def _iso8601_duration_to_hhmmss(iso: str) -> str:
    # PTxHxMxS -> HH:MM:SS
    h = m = s = 0
    mobj = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if mobj:
        h = int(mobj.group(1) or 0)
        m = int(mobj.group(2) or 0)
        s = int(mobj.group(3) or 0)
    total = h * 3600 + m * 60 + s
    hh = total // 3600
    mm = (total % 3600) // 60
    ss = total % 60
    return f"{hh:d}:{mm:02d}:{ss:02d}" if hh else f"{m:d}:{s:02d}"


def parse_chapters(description: str):
    """
    Video açıklamasından YouTube tarzı chapters (bölümler) çıkarır.
    """
    lines = description.splitlines()
    chapters = []
    pattern = re.compile(r"^(?P<time>(?:\d+:)?\d{1,2}:\d{2})\s*(?P<title>.+)$")
    for line in lines:
        m = pattern.match(line.strip())
        if m:
            time_str = m.group("time")
            title = m.group("title").strip()
            parts = list(map(int, time_str.split(":")))
            if len(parts) == 3:
                seconds = parts[0]*3600 + parts[1]*60 + parts[2]
            elif len(parts) == 2:
                seconds = parts[0]*60 + parts[1]
            else:
                continue
            chapters.append({"start_seconds": seconds, "title": title})
    return chapters


# Anahtar kelimeye göre yeni video olup olmadığını kontrol eden yeni fonksiyon
def get_new_videos_for_query(query: str, last_checked_at: str = None):
    """
    Belirli bir anahtar kelime için en yeni videoları çeker ve
    en son kontrol edilen zamandan (last_checked_at) sonrakileri döndürür.
    """
    # Arama parametreleri: en yeni videoları getirmesi için "date" order kullan
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "relevanceLanguage": "tr", # Diline göre değiştirilebilir
        "maxResults": 10,
        "order": "date",  # ✅ En yeni videoları çekmek için
        "key": YOUTUBE_API_KEY
    }

    r = requests.get(SEARCH_URL, params=params)
    data = r.json()
    if "items" not in data:
        return []

    new_videos = []
    last_check_datetime = datetime.fromisoformat(last_checked_at.replace("Z", "+00:00")) if last_checked_at else None

    for item in data["items"]:
        published_at_str = item["snippet"]["publishedAt"]
        published_at = datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))

        if last_check_datetime and published_at <= last_check_datetime:
            # Bu videodan daha eskileri zaten görmüştür, durdur
            break

        # Yeni video ekle
        new_videos.append({
            "video_id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "published_at": published_at_str,
            "channel_title": item["snippet"]["channelTitle"],
            "thumbnail": item["snippet"]["thumbnails"]["high"]["url"],
        })
    
    return new_videos


def search_videos(query, language="tr", max_results=9, order="relevance", page_token=None, fresh=False):
    """
    YouTube araması. fresh=False ise (ve ilk sayfa + relevance) Supabase cache kullanılabilir.
    """
    use_cache = (not fresh) and (not page_token) and (order == "relevance")

    # 1) CACHE
    if use_cache:
        cached = supabase.table("videos").select("*").eq("query", query).execute()
        if cached.data:
            items = [{
                "video_id": row["video_id"],
                "title": row["title"],
                "description": row["description"],
                "thumbnail": row["thumbnail"],
                "published_at": row["published_at"],
                "channel_title": row.get("channel_title", ""),
                "duration": row.get("duration"),
                "chapters": row.get("chapters", []),
            } for row in cached.data]
            return {"items": items, "nextPageToken": None}

    # 2) SEARCH
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "relevanceLanguage": language,
        "maxResults": max_results,
        "order": order,
        "key": YOUTUBE_API_KEY
    }
    if page_token:
        params["pageToken"] = page_token

    r = requests.get(SEARCH_URL, params=params)
    data = r.json()
    if "items" not in data or not data["items"]:
        return {"items": [], "nextPageToken": None}

    # 3) Detay çağrısı ile süre ve snippet
    video_ids = [it["id"]["videoId"] for it in data["items"]]
    vr = requests.get(VIDEOS_URL, params={
        "part": "contentDetails,snippet",
        "id": ",".join(video_ids),
        "key": YOUTUBE_API_KEY
    })
    vdata = vr.json()
    durations = {}
    channels = {}
    descriptions = {}
    if "items" in vdata:
        for it in vdata["items"]:
            vid = it["id"]
            dur_iso = it.get("contentDetails", {}).get("duration", "PT0S")
            durations[vid] = _iso8601_duration_to_hhmmss(dur_iso)
            channels[vid] = it.get("snippet", {}).get("channelTitle", "")
            descriptions[vid] = it.get("snippet", {}).get("description", "")

    cleaned = []
    for it in data["items"]:
        vid = it["id"]["videoId"]
        sn = it["snippet"]
        desc = descriptions.get(vid, "")
        cleaned.append({
            "video_id": vid,
            "title": sn["title"],
            "description": desc,
            "thumbnail": sn["thumbnails"]["high"]["url"],
            "published_at": sn["publishedAt"],
            "channel_title": channels.get(vid, sn.get("channelTitle", "")),
            "duration": durations.get(vid, None),
            "chapters": parse_chapters(desc),
        })

    # 4) Cache'e sadece ilk sayfa + relevance + fresh=False iken yaz
    if use_cache:
        for v in cleaned:
            supabase.table("videos").upsert({
                "query": query,
                "video_id": v["video_id"],
                "title": v["title"],
                "description": v["description"],
                "thumbnail": v["thumbnail"],
                "published_at": v["published_at"],
                "duration": v.get("duration"),
                "channel_title": v.get("channel_title"),
                "chapters": v.get("chapters"),
            }, on_conflict="video_id").execute()

    return {"items": cleaned, "nextPageToken": data.get("nextPageToken")}