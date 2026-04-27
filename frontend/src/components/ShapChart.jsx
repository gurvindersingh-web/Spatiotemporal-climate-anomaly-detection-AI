import { useMemo } from 'react';
import { motion } from 'framer-motion';

const FEATURE_LABELS = {
  temperature_anomaly: 'Temperature',
  precipitation_anomaly: 'Precipitation',
  wind_anomaly: 'Wind',
  sst_departure: 'SST Departure',
};

const FEATURE_ICONS = {
  temperature_anomaly: '🌡️',
  precipitation_anomaly: '🌧️',
  wind_anomaly: '💨',
  sst_departure: '🌊',
};

const BAR_GRADIENTS = {
  temperature_anomaly: 'linear-gradient(90deg, #ff6b6b, #ee5a24)',
  precipitation_anomaly: 'linear-gradient(90deg, #4facfe, #00f2fe)',
  wind_anomaly: 'linear-gradient(90deg, #43e97b, #38f9d7)',
  sst_departure: 'linear-gradient(90deg, #a18cd1, #fbc2eb)',
};

export default function ShapChart({ explanation }) {
  const sortedFeatures = useMemo(() => {
    if (!explanation?.feature_importances) return [];
    return Object.entries(explanation.feature_importances)
      .sort((a, b) => b[1] - a[1]);
  }, [explanation]);

  if (!sortedFeatures.length) return null;

  const maxVal = sortedFeatures[0]?.[1] || 1;

  return (
    <div>
      {sortedFeatures.map(([name, value], i) => (
        <motion.div
          key={name}
          className="shap-bar-container"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
        >
          <div className="shap-bar-label">
            <span className="shap-bar-name">
              {FEATURE_ICONS[name]} {FEATURE_LABELS[name] || name}
            </span>
            <span className="shap-bar-value">
              {(value * 100).toFixed(1)}%
              {explanation.raw_feature_values?.[name] != null && (
                <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.68rem' }}>
                  z={explanation.raw_feature_values[name].toFixed(1)}
                </span>
              )}
            </span>
          </div>
          <div className="shap-bar-track">
            <motion.div
              className="shap-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(value / maxVal) * 100}%` }}
              transition={{ delay: i * 0.08 + 0.1, duration: 0.5, ease: 'easeOut' }}
              style={{
                background: BAR_GRADIENTS[name] || 'var(--gradient-primary)',
              }}
            />
          </div>
        </motion.div>
      ))}

      {/* Dominant driver callout */}
      {explanation.dominant_driver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(37, 99, 235, 0.05)',
            border: '1px solid rgba(37, 99, 235, 0.12)',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>Dominant driver:</span>{' '}
          {FEATURE_LABELS[explanation.dominant_driver] || explanation.dominant_driver}{' '}
          ({(explanation.dominant_contribution * 100).toFixed(1)}% contribution)
        </motion.div>
      )}
    </div>
  );
}
