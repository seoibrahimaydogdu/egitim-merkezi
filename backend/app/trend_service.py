# backend/app/trend_service.py
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from .supabase_client import supabase

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

def get_seo_trends():
    """
    Supabase'den SEO trendlerini çeker. Eğer veri yoksa veya eskiyse (24 saatten fazla),
    güncelleyip geri döner. Gerçek bir uygulamada, trend verisi Google Trends'ten çekilebilir.
    """
    
    # 1. Supabase'den trend verisini çek
    try:
        response = supabase.table("seo_trends").select("*").execute()
        trends = response.data
    except Exception as e:
        print(f"Supabase'den trend verisi çekilirken hata oluştu: {e}")
        return []

    # 2. Veri yoksa veya eskiyse (örnekte 24 saat), sahte veriyle güncelle
    if not trends or is_data_outdated(trends):
        print("Trend verisi yok veya güncel değil. Güncelleniyor...")
        try:
            # Supabase'i yeni sahte verilerle güncelliyoruz (upsert)
            supabase.table("seo_trends").upsert(DUMMY_TRENDS_DATA, on_conflict="keyword").execute()
            # Güncel veriyi tekrar çekiyoruz
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
    
    # En son güncellenen verinin zamanını kontrol et
    # Tüm verilerin aynı anda güncellendiğini varsayıyoruz
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