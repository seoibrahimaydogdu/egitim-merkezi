# backend/app/supabase_client.py
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

def _load_env():
    """
    .env için olası yolları sırayla dener:
    - backend/.env
    - backend/app/.env
    - proje kökü /.env (cwd)
    """
    candidates = [
        Path(__file__).resolve().parents[1] / ".env",  # backend/.env
        Path(__file__).resolve().parent / ".env",      # backend/app/.env
        Path.cwd() / ".env",                           # proje kökü
    ]
    loaded_from: Optional[Path] = None
    for p in candidates:
        if p.exists():
            load_dotenv(dotenv_path=p)
            loaded_from = p
            break
    if loaded_from is None:
        # yine de ortam değişkenlerinden bir şey gelirse kullanalım
        load_dotenv()  # default davranış
    return loaded_from

_loaded = _load_env()

# Env isimleri için esnek okuma
supabase_url: Optional[str] = (
    os.getenv("SUPABASE_URL")
    or os.getenv("VITE_SUPABASE_URL")
)

supabase_key: Optional[str] = (
    os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("VITE_SUPABASE_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
)

if not supabase_url or not supabase_key:
    tried = [
        str(Path(__file__).resolve().parents[1] / ".env"),
        str(Path(__file__).resolve().parent / ".env"),
        str(Path.cwd() / ".env"),
    ]
    raise RuntimeError(
        "Supabase URL veya KEY bulunamadı.\n"
        f"Denediğim .env yolları:\n- " + "\n- ".join(tried) + "\n\n"
        "Lütfen aşağıdaki değişkenlerden en az bir seti tanımlı olsun:\n"
        "  SUPABASE_URL + SUPABASE_KEY\n"
        "  SUPABASE_URL + SUPABASE_ANON_KEY\n"
        "  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY\n"
    )

# Supabase istemcisi
supabase: Client = create_client(supabase_url, supabase_key)
