"""
Layer 2 — Lightweight Mock Data Pipeline.
Generates synchronous mock data using NumPy and Pandas.
"""

import numpy as np
import pandas as pd
from loguru import logger
import config

def fetch_era5(*args, **kwargs):
    logger.info("Mock data pipeline: fetch_era5 is a no-op.")
    return None

def load_cached(*args, **kwargs):
    logger.info("Generating lightweight mock dataset in-memory...")
    lat_min, lat_max, lon_min, lon_max = config.LAT_MIN, config.LAT_MAX, config.LON_MIN, config.LON_MAX
    lats = np.arange(lat_max, lat_min, -config.GRID_RESOLUTION)
    lons = np.arange(lon_min, lon_max, config.GRID_RESOLUTION)
    # Just generate 10 timesteps for the lightweight version
    times = pd.date_range("2024-06-01", periods=10, freq="6h")
    
    nlat, nlon, ntime = len(lats), len(lons), len(times)
    rng = np.random.default_rng(42)
    
    t2m = rng.normal(300, 5, (ntime, nlat, nlon))
    tp = rng.exponential(1.0, (ntime, nlat, nlon))
    u10 = rng.normal(2, 3, (ntime, nlat, nlon))
    v10 = rng.normal(1, 2, (ntime, nlat, nlon))
    sst = rng.normal(295, 2, (ntime, nlat, nlon))
    
    return {
        "t2m": t2m, "tp": tp, "u10": u10, "v10": v10, "sst": sst,
        "latitude": lats, "longitude": lons, "time": times
    }

def compute_climatology(ds):
    clim = {}
    for var in ["t2m", "tp", "u10", "v10", "sst"]:
        clim[f"{var}_mean"] = np.mean(ds[var], axis=0)
        clim[f"{var}_std"] = np.std(ds[var], axis=0).clip(min=1e-6)
    return clim

def engineer_features(ds, clim=None):
    if clim is None:
        clim = compute_climatology(ds)
        
    temp_z = (ds["t2m"] - clim["t2m_mean"]) / clim["t2m_std"]
    precip_z = (ds["tp"] - clim["tp_mean"]) / clim["tp_std"]
    
    u_anom = ds["u10"] - clim["u10_mean"]
    v_anom = ds["v10"] - clim["v10_mean"]
    wind_mag = np.sqrt(u_anom**2 + v_anom**2)
    wind_clim = np.sqrt(clim["u10_std"]**2 + clim["v10_std"]**2)
    wind_z = wind_mag / wind_clim
    
    sst_dep = (ds["sst"] - clim["sst_mean"]) / clim["sst_std"]
    
    features_4d = np.stack([temp_z, precip_z, wind_z, sst_dep], axis=-1)
    features_flat = features_4d.reshape(-1, 4)
    features_flat = np.nan_to_num(features_flat, nan=0.0, posinf=5.0, neginf=-5.0)
    
    logger.info(f"Features generated: {features_flat.shape}")
    return features_flat, features_4d.shape[:3]

def get_grid_coordinates(ds):
    return {
        "latitudes": ds["latitude"],
        "longitudes": ds["longitude"],
        "times": ds["time"],
        "resolution": config.GRID_RESOLUTION
    }
