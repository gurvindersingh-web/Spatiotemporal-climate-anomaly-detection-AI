import React from 'react';

export default function Footer() {
  return (
    <footer style={{ background: 'rgba(0,0,0,0.5)', padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', borderTop: '1px solid var(--glass-border)' }}>
      <p style={{ marginBottom: '10px' }}>Powered by Open-Meteo + Google Gemini + n8n</p>
      <a href="#" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>GitHub Repository</a>
    </footer>
  );
}
