# Spatiotemporal Climate Anomaly Detection

Real-time climate anomaly detection system using VAE + Isolation Forest ensemble with SHAP explainability and conformal prediction forecasting.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Generate synthetic data (no API key needed for demo)
python data_pipeline.py

# 3. Start the API server
python server.py

# 4. Test endpoints
curl http://localhost:8000/health
curl -X POST http://localhost:8000/detect
curl http://localhost:8000/explain/grid_15_22
curl http://localhost:8000/forecast/grid_15_22
curl http://localhost:8000/alerts
```

## Architecture

```
ERA5 Data → Zarr Cache → Feature Engineering
    ↓
VAE (reconstruction error) + Isolation Forest (tree-based isolation)
    ↓
Fusion (0.6 VAE + 0.4 IF) → Anomaly Scores [0, 1]
    ↓
Classification: watch (0.7) / warning (0.8) / extreme (0.9)
    ↓
GeoJSON FeatureCollection → FastAPI → deck.gl Map
    ↓
SHAP Explainability → Gemini Narrative → /explain endpoint
    ↓
Conformal Prediction Forecast → /forecast endpoint
    ↓
WebSocket Live Stream → /ws/live
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check + model status |
| POST | `/detect` | Full anomaly detection → GeoJSON |
| GET | `/explain/{region_id}` | SHAP values + LLM narrative |
| GET | `/forecast/{region_id}` | 24-step forecast + CI bands |
| GET | `/alerts` | Filtered alert list |
| WS | `/ws/live` | Real-time anomaly stream |

## Docker

```bash
docker-compose up --build
```

## Demo Flow (90 seconds)

1. **Map**: Open deck.gl rendering of `/detect` output
2. **Raw JSON**: Show `/detect` response in Postman
3. **Explain**: Click anomaly → `/explain/grid_15_22` → SHAP + narrative
4. **Forecast**: Show `/forecast/grid_15_22` → 24h prediction with CI bands

## Key ML Decisions

- **VAE**: Learns "normal" climate patches. Heatwaves cause high reconstruction error.
- **Isolation Forest**: 4D feature vector (temp_z, precip_z, wind_mag, sst_dep). Anomalies are isolated quickly in sparse feature regions.
- **SHAP**: TreeExplainer on Isolation Forest gives exact feature attribution.
- **Conformal Prediction**: MAPIE provides distribution-free 90% coverage guarantee.
- **LLM Narrative**: Gemini generates meteorologist-grade plain English explanations.
