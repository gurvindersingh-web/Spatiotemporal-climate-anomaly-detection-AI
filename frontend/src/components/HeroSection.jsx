import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Map } from 'lucide-react';

export default function HeroSection() {
  const [anomalies, setAnomalies] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnomalies(prev => (prev < 147 ? prev + 3 : 147));
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
        top: '-10%', left: '-10%', borderRadius: '50%', filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        bottom: '-10%', right: '-10%', borderRadius: '50%', filter: 'blur(40px)'
      }} />

      <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '800px', padding: '20px' }}>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ fontSize: '4rem', fontWeight: 800, marginBottom: '20px' }}
        >
          <span className="text-gradient">ClimateGuard AI</span>
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.6 }}
        >
          Real-time anomaly detection across Earth's climate systems, powered by Gemini AI and Open-Meteo.
        </motion.p>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '60px' }}
        >
          <button className="btn-primary hover-glow" onClick={() => document.getElementById('map').scrollIntoView({ behavior: 'smooth' })}>
            <Map size={20} /> Explore Live Data
          </button>
          <button className="btn-secondary hover-glow" onClick={() => document.getElementById('detector').scrollIntoView({ behavior: 'smooth' })}>
            <Search size={20} /> Detect Anomaly
          </button>
        </motion.div>

        <motion.div 
          className="glass-card"
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ display: 'flex', justifyContent: 'space-around', padding: '20px 40px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{anomalies}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Anomalies Detected</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-teal)' }}>5</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Regions Monitored</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-purple)' }}>98.2%</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Accuracy</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>30s</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Live Updates</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
