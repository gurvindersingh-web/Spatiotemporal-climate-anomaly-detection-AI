/**
 * TimeSlider — Enhanced historical timeline scrubber with gradient visualization.
 * Displays years 1991-2025 with rich visual feedback and interactive year selection.
 */

import React from 'react';
import { Calendar } from 'lucide-react';

export default function TimeSlider({ year, onYearChange, minYear = 1991, maxYear = 2025 }) {
  const progress = ((year - minYear) / (maxYear - minYear)) * 100;
  const yearTicks = [minYear, 2000, 2010, 2018, 2020, maxYear];

  return (
    <div className="time-slider" id="time-slider" style={styles.container}>
      {/* Header with label and current year */}
      <div style={styles.header}>
        <div style={styles.labelBlock}>
          <Calendar size={13} style={{ color: '#7c8aa0' }} />
          <span style={styles.label}>HISTORICAL TIMELINE</span>
        </div>
        <div style={styles.yearDisplay}>{year}</div>
      </div>

      {/* Gradient timeline track */}
      <div style={styles.trackContainer}>
        {/* Background gradient bar */}
        <div style={styles.gradientBar} />

        {/* Year tick markers */}
        <div style={styles.ticksContainer}>
          {yearTicks.map((y) => (
            <div
              key={y}
              style={{
                ...styles.tick,
                left: `${((y - minYear) / (maxYear - minYear)) * 100}%`,
              }}
            >
              <div style={styles.tickLabel}>{y}</div>
            </div>
          ))}
        </div>

        {/* Range input slider */}
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={year}
          onChange={(e) => onYearChange?.(parseInt(e.target.value, 10))}
          className="time-slider-input"
          id="year-slider-input"
          style={styles.input}
        />

        {/* Progress indicator */}
        <div
          style={{
            ...styles.progress,
            width: `${progress}%`,
          }}
        />

        {/* Current year thumb indicator */}
        <div
          style={{
            ...styles.thumb,
            left: `${progress}%`,
          }}
        />
      </div>

      {/* Year range caption */}
      <div style={styles.footer}>
        <span style={styles.footerText}>{minYear}</span>
        <span style={styles.footerText}>{maxYear}</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '8px 12px',
    background: 'linear-gradient(135deg, rgba(31,41,55,0.7), rgba(17,24,39,0.9))',
    borderRadius: '8px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(75, 85, 99, 0.3)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },

  labelBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  label: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.6px',
    color: '#8b94a5',
    textTransform: 'uppercase',
  },

  yearDisplay: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    minWidth: '40px',
    textAlign: 'right',
  },

  trackContainer: {
    position: 'relative',
    height: '36px',
    marginBottom: '12px',
  },

  gradientBar: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: '5px',
    transform: 'translateY(-50%)',
    background: 'linear-gradient(to right, #1f2937, #4f46e5, #8b5cf6, #ec4899, #f59e0b)',
    borderRadius: '3px',
    boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
  },

  ticksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },

  tick: {
    position: 'absolute',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
  },

  tickLabel: {
    fontSize: '9px',
    color: '#9ca3af',
    fontWeight: 500,
    marginTop: '14px',
    whiteSpace: 'nowrap',
    transition: 'color 0.2s ease',
  },

  input: {
    position: 'absolute',
    top: '50%',
    left: 0,
    width: '100%',
    height: '100%',
    transform: 'translateY(-50%)',
    appearance: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    zIndex: 5,
    WebkitAppearance: 'none',
    outline: 'none',

    // Webkit slider styles
    WebkitSlider: {
      WebkitAppearance: 'none',
    },
  },

  progress: {
    position: 'absolute',
    top: '50%',
    left: 0,
    height: '5px',
    transform: 'translateY(-50%)',
    background: 'linear-gradient(to right, rgba(79, 70, 229, 0.8), rgba(139, 92, 246, 0.8))',
    borderRadius: '3px',
    boxShadow: '0 0 12px rgba(139, 92, 246, 0.6)',
    pointerEvents: 'none',
  },

  thumb: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '18px',
    height: '18px',
    background: 'radial-gradient(circle, #8b5cf6, #7c3aed)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    boxShadow: '0 0 12px rgba(139, 92, 246, 0.8), inset 0 0 6px rgba(255, 255, 255, 0.2)',
    pointerEvents: 'none',
    zIndex: 10,
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '9px',
    color: '#6b7280',
    fontWeight: 500,
  },

  footerText: {
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
};
