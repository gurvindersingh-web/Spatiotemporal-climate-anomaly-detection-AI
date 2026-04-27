"""
Layer 2 — ERA5 Data Pipeline with Zarr Caching.
Fetches ERA5 reanalysis data, caches to Zarr, provides feature engineering.
"""

import argparse
import warnings
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import xarray as xr
from loguru import logger

import config

warnings.filterwarnings("ignore", category=FutureWarning)


def fetch_era5(year: int = 2024, months: list = None, variables: list = None, area: list = None) -> Path:
    """Download ERA5 data via CDS API. Falls back to synthetic data if no credentials."""
    if months is None:
        months = [4, 5, 6]
    if variables is None:
        variables = config.ERA5_VARIABLES
    if area is None:
        area = [config.LAT_MAX, config.LON_MIN, config.LAT_MIN, config.LON_MAX]

    zarr_path = config.DATA_CACHE_DIR / f"era5_{year}_{'_'.join(str(m) for m in months)}.zarr"
    if zarr_path.exists():
        logger.info(f"Cache hit: {zarr_path}")
        return zarr_path

    if not config.CDS_API_KEY or config.CDS_API_KEY == "your_uid:your_api_key":
        logger.warning("No CDS API key — generating synthetic ERA5 data for demo")
        return _generate_synthetic_era5(year, months, area, zarr_path)

    try:
        import cdsapi
        c = cdsapi.Client(url=config.CDS_API_URL, key=config.CDS_API_KEY)
        for month in months:
            logger.info(f"Fetching ERA5: {year}-{month:02d}")
            nc_path = config.DATA_CACHE_DIR / f"era5_{year}_{month:02d}.nc"
            c.retrieve("reanalysis-era5-single-levels", {
                "product_type": "reanalysis", "format": "netcdf",
                "variable": variables, "year": str(year),
                "month": f"{month:02d}",
                "day": [f"{d:02d}" for d in range(1, 32)],
                "time": [f"{h:02d}:00" for h in range(0, 24, 6)],
                "area": area,
            }, str(nc_path))

        datasets = []
        for month in months:
            nc_path = config.DATA_CACHE_DIR / f"era5_{year}_{month:02d}.nc"
            if nc_path.exists():
                datasets.append(xr.open_dataset(nc_path))
        ds = xr.concat(datasets, dim="time")
        ds.to_zarr(zarr_path, mode="w")
        for month in months:
            (config.DATA_CACHE_DIR / f"era5_{year}_{month:02d}.nc").unlink(missing_ok=True)
        return zarr_path
    except Exception as e:
        logger.error(f"CDS API failed: {e}. Falling back to synthetic data.")
        return _generate_synthetic_era5(year, months, area, zarr_path)


def _generate_synthetic_era5(year, months, area, zarr_path):
    """Generate physically-plausible synthetic ERA5 data with injected anomalies."""
    logger.info("Generating synthetic ERA5 data with injected anomalies...")
    lat_max, lon_min, lat_min, lon_max = area
    lats = np.arange(lat_max, lat_min, -config.GRID_RESOLUTION)
    lons = np.arange(lon_min, lon_max, config.GRID_RESOLUTION)
    times = pd.date_range(f"{year}-{months[0]:02d}-01", f"{year}-{months[-1]:02d}-28 18:00", freq="6h")
    nlat, nlon, ntime = len(lats), len(lons), len(times)
    rng = np.random.default_rng(42)

    lat_grid = np.broadcast_to(lats[:, None], (nlat, nlon))
    base_temp = 273.15 + 35 - 0.6 * (lat_grid - lat_min)
    day_of_year = np.array([t.timetuple().tm_yday for t in times])
    seasonal = 5.0 * np.sin(2 * np.pi * (day_of_year - 100) / 365)
    hour_of_day = np.array([t.hour for t in times])
    diurnal = 3.0 * np.sin(2 * np.pi * (hour_of_day - 6) / 24)

    t2m = np.zeros((ntime, nlat, nlon), dtype=np.float32)
    for t in range(ntime):
        t2m[t] = base_temp + seasonal[t] + diurnal[t] + rng.normal(0, 1.5, (nlat, nlon))

    # Inject heatwave anomaly (northwest India, mid-May)
    hw_s, hw_e = ntime // 3, ntime // 3 + 40
    hw_lat, hw_lon = slice(nlat // 4, nlat // 2), slice(0, nlon // 3)
    t2m[hw_s:hw_e, hw_lat, hw_lon] += rng.uniform(6, 10, (hw_e - hw_s, hw_lat.stop - hw_lat.start, hw_lon.stop - hw_lon.start))

    # Inject coastal Bangladesh anomaly (June)
    a2_s, a2_e = 2 * ntime // 3, 2 * ntime // 3 + 20
    a2_lat, a2_lon = slice(nlat * 2 // 3, nlat * 5 // 6), slice(nlon * 2 // 3, nlon * 5 // 6)
    t2m[a2_s:a2_e, a2_lat, a2_lon] += rng.uniform(5, 8, (a2_e - a2_s, a2_lat.stop - a2_lat.start, a2_lon.stop - a2_lon.start))

    tp = rng.lognormal(-2, 1.0, (ntime, nlat, nlon)).astype(np.float32)
    tp[a2_s:a2_e, a2_lat, a2_lon] *= 5.0

    u10 = rng.normal(2.0, 3.0, (ntime, nlat, nlon)).astype(np.float32)
    v10 = rng.normal(1.0, 2.5, (ntime, nlat, nlon)).astype(np.float32)
    u10[hw_s:hw_e, hw_lat, hw_lon] += 4.0

    sst = np.full((ntime, nlat, nlon), np.nan, dtype=np.float32)
    coastal = np.zeros((nlat, nlon), dtype=bool)
    coastal[-10:, :] = True; coastal[:, :8] = True; coastal[:, -10:] = True
    for t in range(ntime):
        sst_base = 300.0 + seasonal[t] * 0.3 + rng.normal(0, 0.5, (nlat, nlon))
        sst[t, coastal] = sst_base[coastal]
    sst[hw_s:hw_e, -10:, :8] += 2.0

    ds = xr.Dataset({
        "t2m": (["time", "latitude", "longitude"], t2m),
        "tp": (["time", "latitude", "longitude"], tp),
        "u10": (["time", "latitude", "longitude"], u10),
        "v10": (["time", "latitude", "longitude"], v10),
        "sst": (["time", "latitude", "longitude"], sst),
    }, coords={"time": times, "latitude": lats, "longitude": lons})
    ds.to_zarr(zarr_path, mode="w")
    logger.success(f"Synthetic ERA5 saved: {zarr_path}")
    return zarr_path


def load_cached(zarr_path: Optional[Path] = None) -> xr.Dataset:
    """Load cached Zarr dataset, generate synthetic if none exists."""
    if zarr_path is None:
        zarr_files = sorted(config.DATA_CACHE_DIR.glob("*.zarr"))
        if not zarr_files:
            zarr_path = fetch_era5()
        else:
            zarr_path = zarr_files[-1]
    return xr.open_zarr(zarr_path)


def compute_climatology(ds: xr.Dataset) -> xr.Dataset:
    """Compute climatological mean and std for Z-score computation."""
    clim = xr.Dataset()
    for var in ["t2m", "tp", "u10", "v10"]:
        if var in ds:
            clim[f"{var}_mean"] = ds[var].mean(dim="time")
            clim[f"{var}_std"] = ds[var].std(dim="time").clip(min=1e-6)
    if "sst" in ds:
        sst_valid = ds["sst"].where(~np.isnan(ds["sst"]))
        clim["sst_mean"] = sst_valid.mean(dim="time")
        clim["sst_std"] = sst_valid.std(dim="time").clip(min=1e-6)
    return clim


def engineer_features(ds: xr.Dataset, clim: xr.Dataset = None):
    """Build 4D feature vector: [temp_z, precip_z, wind_anomaly_mag, sst_departure]."""
    if clim is None:
        clim = compute_climatology(ds)

    temp_z = ((ds["t2m"] - clim["t2m_mean"]) / clim["t2m_std"]).values
    precip_z = ((ds["tp"] - clim["tp_mean"]) / clim["tp_std"]).values

    u_anom = ds["u10"].values - clim["u10_mean"].values[None, :, :]
    v_anom = ds["v10"].values - clim["v10_mean"].values[None, :, :]
    wind_mag = np.sqrt(u_anom ** 2 + v_anom ** 2)
    wind_clim = np.sqrt(clim["u10_std"].values ** 2 + clim["v10_std"].values ** 2)
    wind_z = wind_mag / wind_clim[None, :, :]

    if "sst" in ds and "sst_mean" in clim:
        sst_dep = np.nan_to_num(((ds["sst"] - clim["sst_mean"]) / clim["sst_std"]).values, nan=0.0)
    else:
        sst_dep = np.zeros_like(temp_z)

    features_4d = np.stack([temp_z, precip_z, wind_z, sst_dep], axis=-1)
    features_flat = features_4d.reshape(-1, 4)
    features_flat = np.nan_to_num(features_flat, nan=0.0, posinf=5.0, neginf=-5.0)
    logger.info(f"Features: {features_flat.shape}")
    return features_flat, features_4d.shape[:3]


def get_grid_coordinates(ds):
    return {"latitudes": ds.latitude.values, "longitudes": ds.longitude.values,
            "times": pd.DatetimeIndex(ds.time.values), "resolution": config.GRID_RESOLUTION}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--months", nargs="+", type=int, default=[4, 5, 6])
    args = parser.parse_args()
    zarr_path = fetch_era5(year=args.year, months=args.months)
    ds = load_cached(zarr_path)
    features, shape = engineer_features(ds)
    logger.success(f"Pipeline complete ✓ — Features: {features.shape}, Grid: {shape}")
