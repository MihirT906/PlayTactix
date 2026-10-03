import os

from dotenv import load_dotenv

load_dotenv()

# Comma-separated list of origins allowed to call this API (CORS). Defaults
# to the Vite dev server. In production, set this to the deployed frontend's
# real URL(s), e.g. ALLOWED_ORIGINS=https://your-app.vercel.app
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

# Where the prebuilt per-match files live (see scripts/build_match_data.py
# and .github/workflows/build-match-data.yml). The server downloads
# {base}/tracking_data_{id}.parquet etc. from here on first request.
MATCH_DATA_BASE_URL = os.getenv(
    "MATCH_DATA_BASE_URL",
    "https://github.com/MihirT906/PlayTactix/releases/download/match-data",
).rstrip("/")

# Port to listen on. Several hosting platforms (Render, Railway, ...) inject
# this at runtime and expect the app to bind to it.
PORT = int(os.getenv("PORT", "8000"))
