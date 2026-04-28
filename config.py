"""
Central configuration module (Lightweight).
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent
DATA_CACHE_DIR = Path(os.getenv("DATA_CACHE_DIR", PROJECT_ROOT / "data" / "cache"))
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", PROJECT_ROOT / "models"))
DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

ANOMALY_THRESHOLD_WATCH = float(os.getenv("ANOMALY_THRESHOLD_WATCH", 0.7))
ANOMALY_THRESHOLD_WARNING = float(os.getenv("ANOMALY_THRESHOLD_WARNING", 0.8))
ANOMALY_THRESHOLD_EXTREME = float(os.getenv("ANOMALY_THRESHOLD_EXTREME", 0.9))

IF_N_ESTIMATORS = int(os.getenv("IF_N_ESTIMATORS", 100))
IF_CONTAMINATION = float(os.getenv("IF_CONTAMINATION", 0.05))

GRID_RESOLUTION = 0.25
LAT_MIN = 5.0
LAT_MAX = 40.0
LON_MIN = 60.0
LON_MAX = 100.0
