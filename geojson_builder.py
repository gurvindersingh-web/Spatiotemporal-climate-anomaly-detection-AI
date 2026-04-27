"""
Layer 6 — GeoJSON Output Builder.
Converts anomaly scores + grid coordinates into GeoJSON FeatureCollections
with proper polygons, classifications, and alert metadata.
"""

import numpy as np
from typing import Optional
from loguru import logger

import config


def build_geojson(
    scores: np.ndarray,
    labels: list,
    grid_shape: tuple,
    latitudes: np.ndarray,
    longitudes: np.ndarray,
    timestep_idx: int = -1,
    threshold: float = None,
) -> dict:
    """
    Build a GeoJSON FeatureCollection from anomaly detection results.
    Each anomaly cell becomes a 0.25° × 0.25° polygon.
    """
    threshold = threshold or config.ANOMALY_THRESHOLD_WATCH
    n_time, n_lat, n_lon = grid_shape
    res = config.GRID_RESOLUTION

    # Reshape scores to grid
    scores_grid = scores.reshape(grid_shape)
    t_idx = timestep_idx if timestep_idx >= 0 else n_time - 1
    scores_2d = scores_grid[t_idx]

    labels_arr = np.array(labels).reshape(grid_shape)
    labels_2d = labels_arr[t_idx]

    features = []
    for i in range(n_lat):
        for j in range(n_lon):
            score = float(scores_2d[i, j])
            if score < threshold:
                continue

            lat = float(latitudes[i])
            lon = float(longitudes[j])
            label = str(labels_2d[i, j])

            polygon = _make_cell_polygon(lat, lon, res)
            feature = {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [polygon]},
                "properties": {
                    "region_id": f"grid_{i}_{j}",
                    "anomaly_score": round(score, 4),
                    "zscore": round(score * 5, 2),
                    "classification": label,
                    "lat": lat,
                    "lon": lon,
                    "grid_i": i,
                    "grid_j": j,
                },
            }
            features.append(feature)

    anomaly_count = len(features)
    extreme_count = sum(1 for f in features if f["properties"]["classification"] == "extreme")
    warning_count = sum(1 for f in features if f["properties"]["classification"] == "warning")
    watch_count = sum(1 for f in features if f["properties"]["classification"] == "watch")

    collection = {
        "type": "FeatureCollection",
        "meta": {
            "total_anomalies": anomaly_count,
            "extreme": extreme_count,
            "warning": warning_count,
            "watch": watch_count,
            "threshold": threshold,
            "grid_resolution": res,
            "timestep_index": t_idx,
        },
        "features": features,
    }

    logger.info(f"GeoJSON: {anomaly_count} anomalies ({extreme_count} extreme, {warning_count} warning, {watch_count} watch)")
    return collection


def _make_cell_polygon(lat: float, lon: float, res: float) -> list:
    """Create a closed polygon ring for a grid cell centered at (lat, lon)."""
    half = res / 2
    return [
        [lon - half, lat - half],
        [lon + half, lat - half],
        [lon + half, lat + half],
        [lon - half, lat + half],
        [lon - half, lat - half],  # close the ring
    ]


def build_alert_list(geojson: dict, min_level: str = "watch") -> list:
    """Extract a filtered alert list from GeoJSON features."""
    level_order = {"normal": 0, "watch": 1, "warning": 2, "extreme": 3}
    min_val = level_order.get(min_level, 1)

    alerts = []
    for feat in geojson["features"]:
        props = feat["properties"]
        if level_order.get(props["classification"], 0) >= min_val:
            alerts.append({
                "region_id": props["region_id"],
                "classification": props["classification"],
                "anomaly_score": props["anomaly_score"],
                "lat": props["lat"],
                "lon": props["lon"],
                "message": _alert_message(props),
            })

    alerts.sort(key=lambda x: x["anomaly_score"], reverse=True)
    return alerts


def _alert_message(props: dict) -> str:
    level = props["classification"].upper()
    return (
        f"[{level}] Anomaly detected at ({props['lat']:.2f}°N, {props['lon']:.2f}°E) "
        f"— score: {props['anomaly_score']:.3f}"
    )
