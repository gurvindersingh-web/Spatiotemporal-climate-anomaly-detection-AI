import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { geocodeCity, detectAnomaly } from '../utils/api';

export default function AnomalyDetector({ onDataLoaded }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const geo = await geocodeCity(query);
      const data = await detectAnomaly(geo.latitude, geo.longitude, geo.name);
      setResult(data);
      onDataLoaded(data);
    } catch (err) {
      setError(err.message || 'Failed to detect anomalies.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'Critical': return 'var(--danger)';
      case 'High': return 'var(--warning)';
      case 'Medium': return 'yellow';
      case 'Low': return 'var(--success)';
      default: return 'white';
    }
  };

  return (
    <div id="detector" className="section-container" style={{ maxWidth: '800px' }}>
      <h2 className="section-title">Anomaly Detector</h2>
      <div className="glass-card">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input 
            type="text" 
            placeholder="Search city (e.g. Phoenix, Cairo)..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '1rem'
            }}
          />
          <button type="submit" className="btn-primary hover-glow" disabled={loading}>
            {loading ? <Activity className="pulse" /> : <Search />} Analyze
          </button>
        </form>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Activity size={40} className="pulse" style={{ color: 'var(--accent-blue)', marginBottom: '10px' }} />
            <p>Analyzing climate patterns from Open-Meteo...</p>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(255, 71, 87, 0.1)', padding: '15px', borderRadius: '8px', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            <AlertTriangle style={{ verticalAlign: 'middle', marginRight: '10px' }} />
            {error}
          </div>
        )}

        {result && result.ai_analysis && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{result.location} Analysis</h3>
              <div style={{ background: getRiskColor(result.ai_analysis.risk_level), color: '#000', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                {result.ai_analysis.risk_level} Risk
              </div>
            </div>
            
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '20px' }}>
              {result.ai_analysis.narrative}
            </p>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--glass)', padding: '10px 15px', borderRadius: '8px' }}>
                <strong>Primary Driver:</strong> <span style={{ color: 'var(--accent-teal)' }}>{result.ai_analysis.primary_driver || result.primary_driver}</span>
              </div>
              <div style={{ background: 'var(--glass)', padding: '10px 15px', borderRadius: '8px' }}>
                <strong>Confidence:</strong> {result.ai_analysis.confidence}%
                <div style={{ width: '100%', height: '4px', background: 'var(--glass-border)', marginTop: '5px', borderRadius: '2px' }}>
                  <div style={{ width: `${result.ai_analysis.confidence}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: '2px' }} />
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(46, 213, 115, 0.1)', border: '1px solid var(--success)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <ShieldCheck style={{ color: 'var(--success)', verticalAlign: 'middle', marginRight: '10px' }} />
              <strong>Recommendation:</strong> {result.ai_analysis.recommendation}
            </div>

            <div style={{ background: 'rgba(255, 165, 2, 0.1)', border: '1px solid var(--warning)', padding: '15px', borderRadius: '8px' }}>
              <AlertTriangle style={{ color: 'var(--warning)', verticalAlign: 'middle', marginRight: '10px' }} />
              <strong>24h Forecast:</strong> {result.ai_analysis.forecast_warning}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
