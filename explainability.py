"""
Layer 3b — SHAP Explainability + LLM Narrative Generation.
Provides per-cell feature attribution and plain-English explanations.
"""

import asyncio
import os
from typing import Optional

import numpy as np
from loguru import logger

import config

FEATURE_NAMES = ["temperature_anomaly", "precipitation_anomaly", "wind_anomaly", "sst_departure"]


def compute_shap_values(detector, features: np.ndarray, max_samples: int = 500) -> np.ndarray:
    """
    Compute SHAP values for the Isolation Forest component.
    Returns array of shape (n_samples, 4) with feature importances.
    """
    try:
        import shap
        if features.shape[0] > max_samples:
            idx = np.random.default_rng(42).choice(features.shape[0], max_samples, replace=False)
            background = detector.scaler.transform(features[idx])
        else:
            background = detector.scaler.transform(features)

        explainer = shap.TreeExplainer(detector.iso_forest)
        shap_vals = explainer.shap_values(background)
        logger.info(f"SHAP values computed: {shap_vals.shape}")
        return shap_vals
    except Exception as e:
        logger.warning(f"SHAP computation failed: {e}. Using gradient-based fallback.")
        return _gradient_attribution(detector, features)


def _gradient_attribution(detector, features: np.ndarray) -> np.ndarray:
    """Fallback: use VAE input gradients as feature importance."""
    import torch
    scaled = detector.scaler.transform(features).astype(np.float32)
    t = torch.tensor(scaled, device=detector.device, requires_grad=True)
    detector.vae.eval()
    recon, _, _ = detector.vae(t)
    loss = torch.mean((t - recon) ** 2, dim=1).sum()
    loss.backward()
    grads = t.grad.abs().cpu().numpy()
    return grads


def explain_region(detector, features: np.ndarray, region_features: np.ndarray) -> dict:
    """
    Generate SHAP-based explanation for a specific region.
    Returns feature importances and metadata for LLM narrative.
    """
    try:
        import shap
        scaled = detector.scaler.transform(region_features)
        explainer = shap.TreeExplainer(detector.iso_forest)
        shap_vals = explainer.shap_values(scaled)
        mean_shap = np.abs(shap_vals).mean(axis=0)
    except Exception:
        mean_shap = np.abs(_gradient_attribution(detector, region_features)).mean(axis=0)

    # Normalize to sum to 1
    total = mean_shap.sum()
    if total > 0:
        contributions = mean_shap / total
    else:
        contributions = np.ones(4) / 4

    # Raw feature values for context
    mean_features = region_features.mean(axis=0)

    explanation = {
        "feature_importances": {
            FEATURE_NAMES[i]: round(float(contributions[i]), 4) for i in range(4)
        },
        "raw_feature_values": {
            FEATURE_NAMES[i]: round(float(mean_features[i]), 4) for i in range(4)
        },
        "dominant_driver": FEATURE_NAMES[int(np.argmax(contributions))],
        "dominant_contribution": round(float(contributions.max()), 4),
    }
    return explanation


async def generate_narrative(explanation: dict, region_id: str) -> str:
    """Generate plain-English meteorological explanation via Google Gemini."""
    api_key = config.GEMINI_API_KEY
    if not api_key:
        return _fallback_narrative(explanation, region_id)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        importances = explanation["feature_importances"]
        raw_vals = explanation["raw_feature_values"]

        prompt = (
            f"You are a senior meteorologist. Given SHAP feature importances from a climate anomaly model, "
            f"write a 2-sentence technical alert suitable for a disaster management dashboard.\n\n"
            f"Region {region_id} anomaly detection results:\n"
            f"SHAP feature importances: {importances}\n"
            f"Raw Z-scores: {raw_vals}\n"
            f"Dominant driver: {explanation['dominant_driver']} "
            f"(contribution: {explanation['dominant_contribution']:.1%})\n\n"
            f"Write a 2-sentence technical alert suitable for a disaster management dashboard."
        )

        response = await asyncio.to_thread(
            lambda: model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=200,
                    temperature=0.3,
                ),
            )
        )
        return response.text
    except Exception as e:
        logger.warning(f"LLM narrative failed: {e}. Using template.")
        return _fallback_narrative(explanation, region_id)


def _fallback_narrative(explanation: dict, region_id: str) -> str:
    """Template-based fallback when LLM is unavailable."""
    imp = explanation["feature_importances"]
    raw = explanation["raw_feature_values"]
    driver = explanation["dominant_driver"]
    driver_val = raw[driver]

    narratives = {
        "temperature_anomaly": f"Anomaly in {region_id} driven primarily by a {abs(driver_val):.1f}-sigma temperature departure, consistent with a blocking high-pressure system.",
        "precipitation_anomaly": f"Anomaly in {region_id} driven by extreme precipitation ({abs(driver_val):.1f}-sigma), indicating potential flooding risk from monsoon intensification.",
        "wind_anomaly": f"Anomaly in {region_id} characterized by anomalous wind patterns ({abs(driver_val):.1f}-sigma), suggesting cyclonic activity or jet stream displacement.",
        "sst_departure": f"Anomaly in {region_id} linked to {abs(driver_val):.1f}-sigma SST departure, indicating marine heatwave conditions affecting atmospheric stability.",
    }

    main = narratives.get(driver, f"Multi-factor anomaly detected in {region_id}.")
    secondary = sorted(imp.items(), key=lambda x: x[1], reverse=True)
    if len(secondary) > 1 and secondary[1][1] > 0.15:
        main += f" Secondary contribution from {secondary[1][0].replace('_', ' ')} ({secondary[1][1]:.0%})."

    return main
