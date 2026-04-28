import React from 'react';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 1000,
        padding: '16px 40px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', background: 'rgba(10, 15, 30, 0.8)',
        backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)'
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Globe color="var(--accent-blue)" size={28} />
        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>ClimateGuard AI</span>
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <a href="#map" className="hover-glow" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Live Map</a>
        <a href="#detector" className="hover-glow" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Detector</a>
        <a href="#analytics" className="hover-glow" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Analytics</a>
        <a href="#assistant" className="hover-glow" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Assistant</a>
      </div>
    </motion.nav>
  );
}
