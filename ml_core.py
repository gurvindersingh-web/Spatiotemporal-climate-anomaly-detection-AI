"""
Layer 3 — ML Core: Isolation Forest Ensemble (Lightweight).
"""

import pickle
from pathlib import Path
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from loguru import logger

import config

class AnomalyDetector:
    def __init__(self):
        self.iso_forest = None
        self.scaler = StandardScaler()
        self._trained = False

    @property
    def is_trained(self):
        return self._trained

    def train(self, features: np.ndarray, epochs=None, batch_size=None, lr=None):
        logger.info(f"Training on {features.shape[0]} samples")
        if features.shape[0] > 100_000:
            idx = np.random.default_rng(42).choice(features.shape[0], 100_000, replace=False)
            train_data = features[idx]
        else:
            train_data = features

        scaled = self.scaler.fit_transform(train_data).astype(np.float32)

        self.iso_forest = IsolationForest(
            n_estimators=config.IF_N_ESTIMATORS,
            contamination=config.IF_CONTAMINATION,
            random_state=42, n_jobs=-1,
        )
        self.iso_forest.fit(scaled)
        self._trained = True
        logger.success("Anomaly detector trained ✓")

    def predict(self, features: np.ndarray) -> np.ndarray:
        if not self._trained:
            raise RuntimeError("Model not trained.")

        scaled = self.scaler.transform(features).astype(np.float32)
        if_raw = -self.iso_forest.score_samples(scaled)
        return self._percentile_normalize(if_raw)

    @staticmethod
    def _percentile_normalize(raw: np.ndarray) -> np.ndarray:
        p50 = np.percentile(raw, 50)
        p95 = np.percentile(raw, 95)
        p99 = np.percentile(raw, 99)
        p995 = np.percentile(raw, 99.5)

        result = np.zeros_like(raw)
        
        mask = raw <= p50
        if p50 > raw.min():
            result[mask] = 0.1 * (raw[mask] - raw.min()) / (p50 - raw.min())
        
        mask = (raw > p50) & (raw <= p95)
        if p95 > p50:
            result[mask] = 0.1 + 0.4 * (raw[mask] - p50) / (p95 - p50)
        
        mask = (raw > p95) & (raw <= p99)
        if p99 > p95:
            result[mask] = 0.5 + 0.25 * (raw[mask] - p95) / (p99 - p95)
        
        mask = (raw > p99) & (raw <= p995)
        if p995 > p99:
            result[mask] = 0.75 + 0.15 * (raw[mask] - p99) / (p995 - p99)
        
        mask = raw > p995
        p_max = raw.max()
        if p_max > p995:
            result[mask] = 0.9 + 0.1 * (raw[mask] - p995) / (p_max - p995)
        else:
            result[mask] = 0.95

        return np.clip(result, 0, 1)

    def classify(self, scores: np.ndarray) -> list:
        labels = []
        for s in scores:
            if s >= config.ANOMALY_THRESHOLD_EXTREME:
                labels.append("extreme")
            elif s >= config.ANOMALY_THRESHOLD_WARNING:
                labels.append("warning")
            elif s >= config.ANOMALY_THRESHOLD_WATCH:
                labels.append("watch")
            else:
                labels.append("normal")
        return labels

    def save(self, path: Path = None):
        path = path or config.MODEL_CACHE_DIR
        path.mkdir(parents=True, exist_ok=True)
        with open(path / "iso_forest.pkl", "wb") as f:
            pickle.dump(self.iso_forest, f)
        with open(path / "scaler.pkl", "wb") as f:
            pickle.dump(self.scaler, f)

    def load(self, path: Path = None):
        path = path or config.MODEL_CACHE_DIR
        with open(path / "iso_forest.pkl", "rb") as f:
            self.iso_forest = pickle.load(f)
        with open(path / "scaler.pkl", "rb") as f:
            self.scaler = pickle.load(f)
        self._trained = True
