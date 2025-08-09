# backend/app/trend_service.py
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from .supabase_client import supabase
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid

load_dotenv()

# Sahte verilerimizi burada tutalım
DUMMY_TRENDS_DATA = [
    {
        "keyword": "SGE",
        "alert": "YÜKSELİŞTE",
        "message": "Google'ın SGE özelliği hızla popülerlik kazanıyor. İçerik stratejinizi buna göre optimize etmelisiniz.",
        "link": "https://www.searchenginejournal.com/google-sge-guide/501234/",
        "icon": "📈"
    },
    {
        "keyword": "helpful content update",
        "alert": "DÜŞÜŞTE",
        "message": "Helpful Content Update konusundaki ilgi azalıyor. Ancak hala önemli bir sıralama faktörü.",
        "link": "https://www.searchenginejournal.com/google-helpful-content-system/461234/",
        "icon": "📉"
    },
    {
        "keyword": "core web vitals",
        "alert": "STABİL",
        "message": "Core Web Vitals arama hacmi stabil. Site hızını ve kullanıcı deneyimini iyileştirmeye devam edin.",
        "link": "https://web.dev/vitals/",
        "icon": "📊"
    }
]

app = FastAPI()

class SharePayload(BaseModel):
    user_id: str
    title: str

# ✅ YENİ: Konu ve Kanal Abonelikleri için Pydantic Modelleri
class TopicSubscriptionPayload(BaseModel):
    user_id: str
    channel_id: str
    keyword: str

class ChannelSubscriptionPayload(BaseModel):
    user_id: str
    channel_id: str

@app.post("/share/favorites")
def share_favorites(payload: SharePayload):
    """
    Kullanıcının favori listesini paylaşmak için benzersiz bir link oluşturur.
    """
    supabase_client = supabase
    
    # Kullanıcının favorilerini çek
    favorites_response = supabase_client.table('favorites').select('video_id').eq('user_id', payload.user_id).execute()
    favorites = [fav['video_id'] for fav in favorites_response.data]

    if not favorites:
        raise HTTPException(status_code=404, detail="Paylaşılacak favori bulunamadı.")

    # Paylaşım listesi için benzersiz bir ID oluştur
    share_id = str(uuid.uuid4())

    # Paylaşım listesini veritabanına kaydet
    share_response = supabase_client.table('shared_favorites').insert({
        'share_id': share_id,
        'user_id': payload.user_id,
        'title': payload.title,
        'favorites': favorites
    }).execute()

    if share_response.data:
        # Oluşturulan paylaşım linkini döndür
        return {"share_link": f"http://localhost:3000/shared-list/{share_id}"}
    
    raise HTTPException(status_code=500, detail="Paylaşım linki oluşturulurken bir hata oluştu.")
    
@app.get("/shared-list/{share_id}")
def get_shared_favorites(share_id: str):
    """
    Verilen ID ile paylaşılan favori listesini döndürür.
    """
    supabase_client = supabase
    shared_list_response = supabase_client.table('shared_favorites').select('favorites, title').eq('share_id', share_id).single().execute()
    
    if not shared_list_response.data:
        raise HTTPException(status_code=404, detail="Paylaşılan liste bulunamadı.")
    
    # Favori listesinin içeriğini detaylandırmak için video bilgilerini çekelim
    video_ids = shared_list_response.data['favorites']
    videos_response = supabase_client.table('videos').select('*').in_('video_id', video_ids).execute()
    
    return {
        "title": shared_list_response.data['title'],
        "videos": videos_response.data
    }

# ✅ YENİ: Konu aboneliği ekleme ve silme endpoint'leri
@app.post("/subscribe/topic")
def subscribe_to_topic(payload: TopicSubscriptionPayload):
    """
    Kullanıcıyı belirli bir kanal ve anahtar kelime için abone yapar.
    """
    supabase_client = supabase
    try:
        response = supabase_client.table('topic_subscriptions').insert({
            'user_id': payload.user_id,
            'channel_id': payload.channel_id,
            'keyword': payload.keyword
        }).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/subscribe/topic")
def unsubscribe_from_topic(user_id: str, channel_id: str, keyword: str):
    """
    Kullanıcının belirli bir konu aboneliğini siler.
    """
    supabase_client = supabase
    try:
        response = supabase_client.table('topic_subscriptions').delete().eq('user_id', user_id).eq('channel_id', channel_id).eq('keyword', keyword).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ✅ YENİ: Kanal aboneliği ekleme ve silme endpoint'leri
@app.post("/subscribe/channel")
def subscribe_to_channel(payload: ChannelSubscriptionPayload):
    """
    Kullanıcıyı bir kanala abone yapar.
    """
    supabase_client = supabase
    try:
        response = supabase_client.table('channel_subscriptions').insert({
            'user_id': payload.user_id,
            'channel_id': payload.channel_id
        }).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/subscribe/channel")
def unsubscribe_from_channel(user_id: str, channel_id: str):
    """
    Kullanıcının kanal aboneliğini siler.
    """
    supabase_client = supabase
    try:
        response = supabase_client.table('channel_subscriptions').delete().eq('user_id', user_id).eq('channel_id', channel_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Mevcut kodlar...
def get_seo_trends():
    """
    Supabase'den SEO trendlerini çeker. Eğer veri yoksa veya eskiyse (24 saatten fazla),
    güncelleyip geri döner.
    """
    try:
        response = supabase.table("seo_trends").select("*").execute()
        trends = response.data
    except Exception as e:
        print(f"Supabase'den trend verisi çekilirken hata oluştu: {e}")
        return []

    if not trends or is_data_outdated(trends):
        print("Trend verisi yok veya güncel değil. Güncelleniyor...")
        try:
            supabase.table("seo_trends").upsert(DUMMY_TRENDS_DATA, on_conflict="keyword").execute()
            response = supabase.table("seo_trends").select("*").execute()
            trends = response.data
        except Exception as e:
            print(f"Supabase'e trend verisi yazılırken hata oluştu: {e}")
            return []

    return trends

def is_data_outdated(trends):
    """
    Verinin 24 saatten eski olup olmadığını kontrol eder.
    """
    if not trends:
        return True
    
    last_updated_str = trends[0].get("updated_at")
    if not last_updated_str:
        return True
    
    try:
        last_updated = datetime.fromisoformat(last_updated_str).astimezone(timezone.utc)
        now = datetime.now(timezone.utc)
        return (now - last_updated) > timedelta(hours=24)
    except (ValueError, TypeError) as e:
        print(f"Tarih formatında hata: {e}")
        return True