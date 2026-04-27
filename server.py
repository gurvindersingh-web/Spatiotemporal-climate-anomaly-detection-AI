"""
Layer 5 — FastAPI Server with 6 endpoints.
GET  /health            — liveness + model status
POST /detect            — full anomaly detection → GeoJSON FeatureCollection
GET  /explain/{region}  — SHAP + LLM narrative
GET  /forecast/{region} — 24-step forecast + CI bands
GET  /alerts            — filtered alert list
WS   /ws/live           — real-time anomaly stream
"""

import asyncio
import json
import time
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

import config
from data_pipeline import load_cached, compute_climatology, engineer_features, get_grid_coordinates, fetch_era5
from ml_core import AnomalyDetector
from explainability import explain_region, generate_narrative
from forecasting import AnomalyForecaster
from geojson_builder import build_geojson, build_alert_list

# ══════════════════════════════════════════════════════════════
# Global state (initialized at startup)
# ══════════════════════════════════════════════════════════════

detector = AnomalyDetector()
forecaster = AnomalyForecaster()

_cache = {
    "dataset": None,
    "climatology": None,
    "features": None,
    "grid_shape": None,
    "grid_coords": None,
    "scores": None,
    "labels": None,
    "geojson": None,
    "last_detect_time": 0,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load data, train models if not cached."""
    logger.info("Starting Climate Anomaly Detection API...")

    # Ensure data exists
    fetch_era5()
    ds = load_cached()
    clim = compute_climatology(ds)
    features, grid_shape = engineer_features(ds, clim)
    grid_coords = get_grid_coordinates(ds)

    _cache["dataset"] = ds
    _cache["climatology"] = clim
    _cache["features"] = features
    _cache["grid_shape"] = grid_shape
    _cache["grid_coords"] = grid_coords

    # Load or train models
    try:
        detector.load()
        logger.info("Loaded cached models")
    except Exception:
        logger.info("Training models from scratch...")
        detector.train(features)
        detector.save()

    logger.success("API ready ✓")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Climate Anomaly Detection API",
    description="Spatiotemporal climate anomaly detection with VAE + Isolation Forest ensemble, SHAP explainability, and TFT forecasting.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════
# Endpoint 1: Health Check
# ══════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_trained": detector.is_trained,
        "data_loaded": _cache["dataset"] is not None,
        "grid_shape": list(_cache["grid_shape"]) if _cache["grid_shape"] else None,
        "cache_populated": _cache["geojson"] is not None,
    }


# ══════════════════════════════════════════════════════════════
# Endpoint 2: Detect Anomalies
# ══════════════════════════════════════════════════════════════

@app.post("/detect")
async def detect(
    timestep: int = Query(-1, description="Timestep index (-1 = latest)"),
    threshold: float = Query(None, description="Override anomaly threshold"),
):
    """Run full anomaly detection and return GeoJSON FeatureCollection."""
    start = time.time()

    # Check cache (valid for 30 seconds)
    if _cache["geojson"] and (time.time() - _cache["last_detect_time"]) < 30:
        elapsed = time.time() - start
        cached = _cache["geojson"].copy()
        cached["meta"]["cached"] = True
        cached["meta"]["response_time_ms"] = round(elapsed * 1000, 1)
        return JSONResponse(content=cached)

    features = _cache["features"]
    scores = detector.predict(features)
    labels = detector.classify(scores)
    coords = _cache["grid_coords"]

    geojson = build_geojson(
        scores=scores,
        labels=labels,
        grid_shape=_cache["grid_shape"],
        latitudes=coords["latitudes"],
        longitudes=coords["longitudes"],
        timestep_idx=timestep,
        threshold=threshold,
    )

    elapsed = time.time() - start
    geojson["meta"]["cached"] = False
    geojson["meta"]["response_time_ms"] = round(elapsed * 1000, 1)

    _cache["scores"] = scores
    _cache["labels"] = labels
    _cache["geojson"] = geojson
    _cache["last_detect_time"] = time.time()

    # Populate forecaster with historical scores
    _populate_forecaster(scores, coords)

    return JSONResponse(content=geojson)


def _populate_forecaster(scores, coords):
    """Feed historical scores into the forecaster for each anomalous region."""
    grid_shape = _cache["grid_shape"]
    scores_grid = scores.reshape(grid_shape)
    n_time, n_lat, n_lon = grid_shape

    for i in range(n_lat):
        for j in range(n_lon):
            region_id = f"grid_{i}_{j}"
            ts = scores_grid[:, i, j]
            if ts.max() >= config.ANOMALY_THRESHOLD_WATCH:
                for t_idx in range(n_time):
                    forecaster.add_observation(
                        region_id,
                        str(coords["times"][t_idx]),
                        float(ts[t_idx]),
                    )


# ══════════════════════════════════════════════════════════════
# Endpoint 3: Explain Region
# ══════════════════════════════════════════════════════════════

@app.get("/explain/{region_id}")
async def explain(region_id: str):
    """SHAP explanation + LLM narrative for a specific grid cell."""
    try:
        parts = region_id.replace("grid_", "").split("_")
        i, j = int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        return JSONResponse(status_code=400, content={"error": f"Invalid region_id: {region_id}. Expected format: grid_I_J"})

    grid_shape = _cache["grid_shape"]
    features = _cache["features"].reshape(*grid_shape, 4)
    region_features = features[:, i, j, :]  # all timesteps for this cell

    explanation = explain_region(detector, _cache["features"], region_features)
    narrative = await generate_narrative(explanation, region_id)

    # Get score for this region
    score = None
    if _cache["scores"] is not None:
        scores_grid = _cache["scores"].reshape(grid_shape)
        score = float(scores_grid[-1, i, j])

    return {
        "region_id": region_id,
        "lat": float(_cache["grid_coords"]["latitudes"][i]),
        "lon": float(_cache["grid_coords"]["longitudes"][j]),
        "anomaly_score": score,
        "explanation": explanation,
        "narrative": narrative,
    }


# ══════════════════════════════════════════════════════════════
# Endpoint 4: Forecast
# ══════════════════════════════════════════════════════════════

@app.get("/forecast/{region_id}")
async def forecast(
    region_id: str,
    horizon: int = Query(24, description="Forecast horizon (steps)"),
):
    """24-step anomaly score forecast with conformal prediction intervals."""
    result = forecaster.forecast(region_id, horizon)
    return result


# ══════════════════════════════════════════════════════════════
# Endpoint 5: Alerts
# ══════════════════════════════════════════════════════════════

@app.get("/alerts")
async def alerts(
    level: str = Query("watch", description="Minimum alert level"),
    limit: int = Query(50, description="Max alerts to return"),
):
    """Filtered alert list from most recent detection pass."""
    if _cache["geojson"] is None:
        return {"alerts": [], "message": "Run /detect first"}

    alert_list = build_alert_list(_cache["geojson"], min_level=level)
    return {
        "total": len(alert_list),
        "showing": min(limit, len(alert_list)),
        "min_level": level,
        "alerts": alert_list[:limit],
    }


# ══════════════════════════════════════════════════════════════
# Endpoint 6: WebSocket Live Stream
# ══════════════════════════════════════════════════════════════

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    """Push anomaly scores every 30 seconds for live monitoring."""
    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            if _cache["scores"] is not None and _cache["grid_coords"] is not None:
                grid_shape = _cache["grid_shape"]
                scores_grid = _cache["scores"].reshape(grid_shape)
                coords = _cache["grid_coords"]

                # Add small random perturbation for live feel
                noise = np.random.normal(0, 0.02, scores_grid[-1].shape)
                live_scores = np.clip(scores_grid[-1] + noise, 0, 1)

                # Only send anomalous cells
                anomalies = []
                for i in range(grid_shape[1]):
                    for j in range(grid_shape[2]):
                        score = float(live_scores[i, j])
                        if score >= config.ANOMALY_THRESHOLD_WATCH:
                            anomalies.append({
                                "region_id": f"grid_{i}_{j}",
                                "lat": float(coords["latitudes"][i]),
                                "lon": float(coords["longitudes"][j]),
                                "score": round(score, 4),
                                "classification": _classify_single(score),
                            })

                message = {
                    "type": "anomaly_update",
                    "timestamp": str(np.datetime64("now")),
                    "anomaly_count": len(anomalies),
                    "anomalies": anomalies[:100],  # limit payload
                }
                await websocket.send_json(message)

            await asyncio.sleep(30)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass


def _classify_single(score: float) -> str:
    if score >= config.ANOMALY_THRESHOLD_EXTREME:
        return "extreme"
    elif score >= config.ANOMALY_THRESHOLD_WARNING:
        return "warning"
    elif score >= config.ANOMALY_THRESHOLD_WATCH:
        return "watch"
    return "normal"


# ══════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=config.HOST, port=config.PORT, reload=config.DEBUG)
