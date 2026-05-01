import os
import threading
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="SCAD ML Backend", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared memory stores with thread lock
_lock = threading.Lock()
_hourly_rows = {}
_anomaly_store = {}
_alert_log = []

# Lazy-load ML models to avoid import errors on Vercel
_detector = None
_forecaster = None


def _get_detector():
    global _detector
    if _detector is None:
        try:
            from ml_core import AnomalyDetector
            _detector = AnomalyDetector()
            _detector.load()
        except Exception:
            pass
    return _detector


def _get_forecaster():
    global _forecaster
    if _forecaster is None:
        try:
            from forecasting import AnomalyForecaster
            _forecaster = AnomalyForecaster()
        except Exception:
            pass
    return _forecaster


@app.post("/ingest")
async def ingest(request: Request):
    data = await request.json()
    if not isinstance(data, list):
        data = [data]

    with _lock:
        for row in data:
            region_id = row.get("region_id")
            if not region_id:
                continue
            if region_id not in _hourly_rows:
                _hourly_rows[region_id] = []
            _hourly_rows[region_id].append(row)
            # Enforce 60-day rolling window roughly (assume hourly, 60*24=1440 rows)
            if len(_hourly_rows[region_id]) > 1440:
                _hourly_rows[region_id] = _hourly_rows[region_id][-1440:]

    return {"status": "ingested", "count": len(data)}


@app.post("/detect")
async def detect(request: Request):
    data = await request.json()
    region_id = data.get("region_id")
    algorithm = data.get("algorithm", "isolation_forest")
    threshold = float(data.get("threshold", 0.05))

    features = []
    geojson = {"type": "FeatureCollection", "features": []}

    with _lock:
        _anomaly_store["latest"] = geojson
        if region_id:
            _anomaly_store[region_id] = geojson

    return geojson


@app.get("/forecast/{region_id}")
async def forecast(region_id: str, horizon: int = 7, variable: str = "temperature_2m", alpha: float = 0.1):
    forecaster = _get_forecaster()
    if forecaster is None:
        return {"error": "Forecaster not available", "region_id": region_id}
    try:
        res = forecaster.forecast(region_id, horizon)
    except Exception:
        res = {"error": "Internal server error", "region_id": region_id}

    return res


@app.get("/anomaly/{region_id}")
async def anomaly(region_id: str):
    with _lock:
        record = _anomaly_store.get(region_id, _anomaly_store.get("latest", {}))
    return record


@app.get("/alerts")
async def alerts(page: int = 1, per_page: int = 50, severity: str = None, region_id: str = None, since: str = None):
    with _lock:
        log = list(_alert_log)

    if severity:
        log = [a for a in log if a.get("severity") == severity]
    if region_id:
        log = [a for a in log if a.get("region_id") == region_id]

    start = (page - 1) * per_page
    end = start + per_page

    return {
        "alerts": log[start:end],
        "page": page,
        "per_page": per_page,
        "total": len(log),
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
