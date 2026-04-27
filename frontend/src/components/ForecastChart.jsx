import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TREND_CONFIG = {
  increasing: { icon: TrendingUp, color: '#DC2626', label: 'Increasing', bg: 'rgba(220,38,38,0.06)' },
  decreasing: { icon: TrendingDown, color: '#16A34A', label: 'Decreasing', bg: 'rgba(22,163,74,0.06)' },
  stable: { icon: Minus, color: '#64748B', label: 'Stable', bg: 'rgba(100,116,139,0.06)' },
};

export default function ForecastChart({ forecast }) {
  const chartData = useMemo(() => {
    if (!forecast?.predictions?.length) return [];
    return forecast.predictions.map((p, i) => {
      const ts = new Date(p.timestamp);
      return {
        index: i,
        time: `+${(i + 1) * 6}h`,
        fullTime: ts.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
        predicted: p.predicted_score,
        lower: p.ci_lower,
        upper: p.ci_upper,
        ciRange: [p.ci_lower, p.ci_upper],
      };
    });
  }, [forecast]);

  if (!chartData.length) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        {forecast?.error || 'No forecast data available'}
      </div>
    );
  }

  const trend = TREND_CONFIG[forecast.trend] || TREND_CONFIG.stable;
  const TrendIcon = trend.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Trend indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 16,
          background: trend.bg, border: `1px solid ${trend.color}20`,
          fontSize: '0.72rem', color: trend.color, fontWeight: 500,
        }}>
          <TrendIcon size={12} />
          {trend.label}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {forecast.method?.replace(/_/g, ' ')} · {(forecast.confidence_level * 100).toFixed(0)}% CI
        </div>
      </div>

      {/* Chart */}
      <div className="forecast-chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
              interval={3}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.7, 0.8, 0.9, 1.0]}
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />

            {/* Threshold lines */}
            <ReferenceLine y={0.7} stroke="#D97706" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={0.8} stroke="#DC2626" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={0.9} stroke="#7C3AED" strokeDasharray="4 4" strokeOpacity={0.5} />

            {/* Confidence interval band */}
            <Area
              type="monotone"
              dataKey="ciRange"
              stroke="none"
              fill="url(#ciGradient)"
              activeDot={false}
              isAnimationActive={false}
            />

            {/* Prediction line */}
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#forecastGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#2563EB', stroke: '#fff', strokeWidth: 1 }}
            />

            <Tooltip
              content={({ payload, active }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.97)',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '0.72rem',
                  }}>
                    <div style={{ color: '#475569', marginBottom: 4 }}>{d.fullTime}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Score: </span>
                        <span style={{ color: '#2563EB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {d.predicted?.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>CI: </span>
                        <span style={{ color: '#475569', fontFamily: 'var(--font-mono)' }}>
                          [{d.lower?.toFixed(3)}, {d.upper?.toFixed(3)}]
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
