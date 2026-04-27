"""
Layer 3 — ML Core: VAE + Isolation Forest Ensemble with SHAP.
Variational Autoencoder learns normal climate patterns; reconstruction error = anomaly signal.
Isolation Forest catches anomalies from a complementary tree-based angle.
Fusion: 0.6 × VAE_score + 0.4 × IF_score.
"""

import pickle
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from loguru import logger

import config


# ══════════════════════════════════════════════════════════════
# Variational Autoencoder
# ══════════════════════════════════════════════════════════════

class ClimateVAE(nn.Module):
    """VAE for climate patch anomaly detection via reconstruction error."""

    def __init__(self, input_dim=4, hidden_dim=None, latent_dim=None):
        super().__init__()
        h = hidden_dim or config.VAE_HIDDEN_DIM
        z = latent_dim or config.VAE_LATENT_DIM

        self.encoder = nn.Sequential(
            nn.Linear(input_dim, h), nn.ReLU(), nn.BatchNorm1d(h),
            nn.Linear(h, h // 2), nn.ReLU(), nn.BatchNorm1d(h // 2),
        )
        self.fc_mu = nn.Linear(h // 2, z)
        self.fc_logvar = nn.Linear(h // 2, z)
        self.decoder = nn.Sequential(
            nn.Linear(z, h // 2), nn.ReLU(), nn.BatchNorm1d(h // 2),
            nn.Linear(h // 2, h), nn.ReLU(), nn.BatchNorm1d(h),
            nn.Linear(h, input_dim),
        )

    def encode(self, x):
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        return mu + std * torch.randn_like(std)

    def decode(self, z):
        return self.decoder(z)

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        return self.decode(z), mu, logvar


def vae_loss(recon_x, x, mu, logvar):
    recon = nn.functional.mse_loss(recon_x, x, reduction='sum')
    kld = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    return recon + kld


# ══════════════════════════════════════════════════════════════
# Anomaly Detection Engine
# ══════════════════════════════════════════════════════════════

class AnomalyDetector:
    """Ensemble: VAE reconstruction error + Isolation Forest."""

    def __init__(self):
        self.vae: Optional[ClimateVAE] = None
        self.iso_forest: Optional[IsolationForest] = None
        self.scaler = StandardScaler()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._trained = False

    @property
    def is_trained(self):
        return self._trained

    def train(self, features: np.ndarray, epochs=None, batch_size=None, lr=None):
        """Train both VAE and Isolation Forest on the feature matrix."""
        epochs = epochs or config.VAE_EPOCHS
        batch_size = batch_size or config.VAE_BATCH_SIZE
        lr = lr or config.VAE_LR

        logger.info(f"Training on {features.shape[0]} samples, device={self.device}")

        # Subsample for speed if huge
        if features.shape[0] > 500_000:
            idx = np.random.default_rng(42).choice(features.shape[0], 500_000, replace=False)
            train_data = features[idx]
        else:
            train_data = features

        # Scale
        scaled = self.scaler.fit_transform(train_data).astype(np.float32)

        # ── Train VAE ──
        self.vae = ClimateVAE(input_dim=scaled.shape[1]).to(self.device)
        optimizer = torch.optim.Adam(self.vae.parameters(), lr=lr)
        tensor_data = torch.tensor(scaled, device=self.device)
        dataset = torch.utils.data.TensorDataset(tensor_data)
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

        self.vae.train()
        for epoch in range(epochs):
            total_loss = 0
            for (batch,) in loader:
                optimizer.zero_grad()
                recon, mu, logvar = self.vae(batch)
                loss = vae_loss(recon, batch, mu, logvar)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            if (epoch + 1) % 10 == 0 or epoch == 0:
                logger.info(f"  VAE epoch {epoch+1}/{epochs} loss={total_loss/len(loader.dataset):.4f}")

        # ── Train Isolation Forest ──
        logger.info("Training Isolation Forest...")
        self.iso_forest = IsolationForest(
            n_estimators=config.IF_N_ESTIMATORS,
            contamination=config.IF_CONTAMINATION,
            random_state=42, n_jobs=-1,
        )
        self.iso_forest.fit(scaled)

        self._trained = True
        logger.success("Anomaly detector trained ✓")

    def predict(self, features: np.ndarray) -> np.ndarray:
        """Return fused anomaly scores in [0, 1] for each sample."""
        if not self._trained:
            raise RuntimeError("Model not trained. Call train() first.")

        scaled = self.scaler.transform(features).astype(np.float32)

        # VAE reconstruction error — process in batches to avoid OOM
        self.vae.eval()
        batch_size = 100_000
        vae_errors = []
        with torch.no_grad():
            for start in range(0, len(scaled), batch_size):
                batch = torch.tensor(scaled[start:start + batch_size], device=self.device)
                recon, _, _ = self.vae(batch)
                err = torch.mean((batch - recon) ** 2, dim=1).cpu().numpy()
                vae_errors.append(err)
        vae_error = np.concatenate(vae_errors)

        # Percentile-based normalization for VAE scores
        # Maps 95th percentile → 0.5, 99.5th → 0.9 to separate anomalies
        vae_score = self._percentile_normalize(vae_error)

        # Isolation Forest score (sklearn returns negative = more anomalous)
        if_raw = -self.iso_forest.score_samples(scaled)
        if_score = self._percentile_normalize(if_raw)

        # Fuse
        fused = config.FUSION_WEIGHT_VAE * vae_score + config.FUSION_WEIGHT_IF * if_score
        return np.clip(fused, 0, 1)

    @staticmethod
    def _percentile_normalize(raw: np.ndarray) -> np.ndarray:
        """Normalize scores using percentile-based mapping.
        
        Maps the score distribution so that:
        - Median (50th pctl) → ~0.1  (most data is normal)
        - 95th percentile    → 0.5   (elevated but not alarming)
        - 99th percentile    → 0.75  (watch level)
        - 99.5th percentile  → 0.9   (extreme)
        """
        p50 = np.percentile(raw, 50)
        p95 = np.percentile(raw, 95)
        p99 = np.percentile(raw, 99)
        p995 = np.percentile(raw, 99.5)

        # Use piecewise linear mapping
        result = np.zeros_like(raw)
        
        # Below median → [0, 0.1]
        mask = raw <= p50
        if p50 > raw.min():
            result[mask] = 0.1 * (raw[mask] - raw.min()) / (p50 - raw.min())
        
        # Median to 95th → [0.1, 0.5]
        mask = (raw > p50) & (raw <= p95)
        if p95 > p50:
            result[mask] = 0.1 + 0.4 * (raw[mask] - p50) / (p95 - p50)
        
        # 95th to 99th → [0.5, 0.75]
        mask = (raw > p95) & (raw <= p99)
        if p99 > p95:
            result[mask] = 0.5 + 0.25 * (raw[mask] - p95) / (p99 - p95)
        
        # 99th to 99.5th → [0.75, 0.9]
        mask = (raw > p99) & (raw <= p995)
        if p995 > p99:
            result[mask] = 0.75 + 0.15 * (raw[mask] - p99) / (p995 - p99)
        
        # Above 99.5th → [0.9, 1.0]
        mask = raw > p995
        p_max = raw.max()
        if p_max > p995:
            result[mask] = 0.9 + 0.1 * (raw[mask] - p995) / (p_max - p995)
        else:
            result[mask] = 0.95

        return np.clip(result, 0, 1)

    def classify(self, scores: np.ndarray) -> list:
        """Classify anomaly scores into alert levels."""
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
        torch.save(self.vae.state_dict(), path / "vae.pt")
        with open(path / "iso_forest.pkl", "wb") as f:
            pickle.dump(self.iso_forest, f)
        with open(path / "scaler.pkl", "wb") as f:
            pickle.dump(self.scaler, f)
        logger.info(f"Models saved to {path}")

    def load(self, path: Path = None):
        path = path or config.MODEL_CACHE_DIR
        self.vae = ClimateVAE().to(self.device)
        self.vae.load_state_dict(torch.load(path / "vae.pt", map_location=self.device, weights_only=True))
        with open(path / "iso_forest.pkl", "rb") as f:
            self.iso_forest = pickle.load(f)
        with open(path / "scaler.pkl", "rb") as f:
            self.scaler = pickle.load(f)
        self._trained = True
        logger.info(f"Models loaded from {path}")
