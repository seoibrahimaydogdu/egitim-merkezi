# backend/app/supabase_client.py
import os
from dotenv import load_dotenv, find_dotenv
from supabase import create_client

# .env'i otomatik bul (kök veya backend altında olsun, fark etmez)
load_dotenv(find_dotenv(usecwd=True))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL veya SUPABASE_KEY bulunamadı. "
        "Kök klasörde .env oluştur ve değerleri yaz."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
