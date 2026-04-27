"""
Central configuration module.
Loads from environment variables with sensible defaults for hackathon demo.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent
DATA_CACHE_DIR = Path(os.getenv("DATA_CACHE_DIR", PROJECT_ROOT / "data" / "cache"))
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", PROJECT_ROOT / "models"))
DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────
# Server
# ──────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# ──────────────────────────────────────────────
# CDS API (ERA5)
# ──────────────────────────────────────────────
CDS_API_URL = os.getenv("CDS_API_URL", "https://cds.climate.copernicus.eu/api")
CDS_API_KEY = os.getenv("CDS_API_KEY", "")

# ──────────────────────────────────────────────
# Google Gemini (LLM explanations)
# ──────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ──────────────────────────────────────────────
# Redis
# ──────────────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# ──────────────────────────────────────────────
# ML Model Parameters
# ──────────────────────────────────────────────
VAE_LATENT_DIM = int(os.getenv("VAE_LATENT_DIM", 16))
VAE_HIDDEN_DIM = int(os.getenv("VAE_HIDDEN_DIM", 64))
VAE_EPOCHS = int(os.getenv("VAE_EPOCHS", 30))
VAE_BATCH_SIZE = int(os.getenv("VAE_BATCH_SIZE", 64))
VAE_LR = float(os.getenv("VAE_LR", 1e-3))

# ──────────────────────────────────────────────
# Anomaly Detection Thresholds
# ──────────────────────────────────────────────
ANOMALY_THRESHOLD_WATCH = float(os.getenv("ANOMALY_THRESHOLD_WATCH", 0.7))
ANOMALY_THRESHOLD_WARNING = float(os.getenv("ANOMALY_THRESHOLD_WARNING", 0.8))
ANOMALY_THRESHOLD_EXTREME = float(os.getenv("ANOMALY_THRESHOLD_EXTREME", 0.9))

# Fusion weights for VAE + Isolation Forest ensemble
FUSION_WEIGHT_VAE = float(os.getenv("FUSION_WEIGHT_VAE", 0.6))
FUSION_WEIGHT_IF = float(os.getenv("FUSION_WEIGHT_IF", 0.4))

# ──────────────────────────────────────────────
# Isolation Forest
# ──────────────────────────────────────────────
IF_N_ESTIMATORS = int(os.getenv("IF_N_ESTIMATORS", 200))
IF_CONTAMINATION = float(os.getenv("IF_CONTAMINATION", 0.05))

# ──────────────────────────────────────────────
# TFT Forecasting
# ──────────────────────────────────────────────
TFT_HIDDEN_SIZE = int(os.getenv("TFT_HIDDEN_SIZE", 32))
TFT_MAX_EPOCHS = int(os.getenv("TFT_MAX_EPOCHS", 15))
TFT_MAX_PREDICTION_LENGTH = int(os.getenv("TFT_MAX_PREDICTION_LENGTH", 24))
TFT_MAX_ENCODER_LENGTH = int(os.getenv("TFT_MAX_ENCODER_LENGTH", 72))

# ──────────────────────────────────────────────
# GeoJSON grid resolution (ERA5 default)
# ──────────────────────────────────────────────
GRID_RESOLUTION = 0.25  # degrees

# ──────────────────────────────────────────────
# Geographic bounds (South Asia focus)
# ──────────────────────────────────────────────
LAT_MIN = 5.0
LAT_MAX = 40.0
LON_MIN = 60.0
LON_MAX = 100.0

# ERA5 variables to fetch
ERA5_VARIABLES = [
    "2m_temperature",
    "total_precipitation",
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "sea_surface_temperature",
]
