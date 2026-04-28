"""
Layer 3b — Explainability + LLM Narrative Generation (Lightweight).
"""
import asyncio
import numpy as np
from loguru import logger
import config

FEATURE_NAMES = ["temperature_anomaly", "precipitation_anomaly", "wind_anomaly", "sst_departure"]

def explain_region(detector, features: np.ndarray, region_features: np.ndarray) -> dict:
    # Simple feature attribution: normalized absolute deviation from normal
    scaled = detector.scaler.transform(region_features)
    mean_deviation = np.abs(scaled).mean(axis=0)
    
    total = mean_deviation.sum()
    if total > 0:
        contributions = mean_deviation / total
    else:
        contributions = np.ones(4) / 4

    mean_features = region_features.mean(axis=0)

    return {
        "feature_importances": {
            FEATURE_NAMES[i]: round(float(contributions[i]), 4) for i in range(4)
        },
        "raw_feature_values": {
            FEATURE_NAMES[i]: round(float(mean_features[i]), 4) for i in range(4)
        },
        "dominant_driver": FEATURE_NAMES[int(np.argmax(contributions))],
        "dominant_contribution": round(float(contributions.max()), 4),
    }

async def generate_narrative(explanation: dict, region_id: str) -> str:
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
            f"You are a senior meteorologist. Given simple feature importances from a climate anomaly model, "
            f"write a 2-sentence technical alert suitable for a disaster management dashboard.\n\n"
            f"Region {region_id} anomaly detection results:\n"
            f"Feature importances: {importances}\n"
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
    imp = explanation["feature_importances"]
    raw = explanation["raw_feature_values"]
    driver = explanation["dominant_driver"]
    driver_val = raw[driver]

    narratives = {
        "temperature_anomaly": f"Anomaly in {region_id} driven primarily by a {abs(driver_val):.1f}-sigma temperature departure.",
        "precipitation_anomaly": f"Anomaly in {region_id} driven by extreme precipitation ({abs(driver_val):.1f}-sigma).",
        "wind_anomaly": f"Anomaly in {region_id} characterized by anomalous wind patterns ({abs(driver_val):.1f}-sigma).",
        "sst_departure": f"Anomaly in {region_id} linked to {abs(driver_val):.1f}-sigma SST departure.",
    }

    main = narratives.get(driver, f"Multi-factor anomaly detected in {region_id}.")
    secondary = sorted(imp.items(), key=lambda x: x[1], reverse=True)
    if len(secondary) > 1 and secondary[1][1] > 0.15:
        main += f" Secondary contribution from {secondary[1][0].replace('_', ' ')} ({secondary[1][1]:.0%})."

    return main
