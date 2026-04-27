import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Zap, BarChart3, Shield, TrendingUp, ChevronRight,
  Cpu, Layers, Activity, ArrowRight, Sparkles
} from 'lucide-react';

const Spline = lazy(() => import('@splinetool/react-spline'));

const FEATURES = [
  {
    icon: <Cpu size={20} />,
    title: 'VAE + Isolation Forest',
    desc: 'Dual-model ensemble fusing deep reconstruction errors with tree-based anomaly scoring',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'SHAP Explainability',
    desc: 'Per-feature attribution with AI-generated meteorological narratives',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Conformal Forecasting',
    desc: '24-step anomaly forecasting with statistically calibrated prediction intervals',
    gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  },
  {
    icon: <Shield size={20} />,
    title: 'Real-time Monitoring',
    desc: 'WebSocket-driven live anomaly stream with sub-second threat classification',
    gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)',
  },
];

const STATS = [
  { value: '0.25°', label: 'Grid Resolution', suffix: '' },
  { value: '5', label: 'ERA5 Variables', suffix: '' },
  { value: '24h', label: 'Forecast Horizon', suffix: '' },
  { value: '<2s', label: 'Detection Speed', suffix: '' },
];

const floatingParticles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 20 + 15,
  delay: Math.random() * 10,
  opacity: Math.random() * 0.3 + 0.05,
}));

export default function HeroPage({ onEnterDashboard }) {
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <div className="hero-page" id="hero-page">
      {/* Animated background particles */}
      <div className="hero-particles">
        {floatingParticles.map((p) => (
          <div
            key={p.id}
            className="hero-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Gradient orbs */}
      <div
        className="hero-orb hero-orb-1"
        style={{
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
        }}
      />
      <div
        className="hero-orb hero-orb-2"
        style={{
          transform: `translate(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px)`,
        }}
      />
      <div
        className="hero-orb hero-orb-3"
        style={{
          transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)`,
        }}
      />

      {/* Navigation bar */}
      <motion.nav
        className="hero-nav"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="hero-nav-left">
          <div className="hero-nav-logo">🌍</div>
          <span className="hero-nav-brand">ClimateGuard AI</span>
        </div>
        <div className="hero-nav-links">
          <a href="#features" className="hero-nav-link">Features</a>
          <a href="#tech" className="hero-nav-link">Technology</a>
          <button className="hero-nav-cta" onClick={onEnterDashboard}>
            Launch Dashboard
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.nav>

      {/* Main hero content */}
      <div className="hero-content">
        {/* Left text content */}
        <div className="hero-text-section">
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Sparkles size={12} />
            <span>Powered by Deep Learning & ERA5 Reanalysis</span>
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <span className="hero-title-line">Spatiotemporal</span>
            <span className="hero-title-gradient">Climate Anomaly</span>
            <span className="hero-title-line">Detection</span>
          </motion.h1>

          <motion.p
            className="hero-description"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            Next-generation geospatial threat monitoring combining Variational Autoencoders
            with Isolation Forest ensembles to detect, explain, and forecast climate anomalies
            across South Asia in real-time.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            <button className="hero-btn-primary" onClick={onEnterDashboard} id="launch-dashboard-btn">
              <Zap size={18} />
              Launch Dashboard
              <ChevronRight size={16} />
            </button>
            <a href="#features" className="hero-btn-secondary">
              <Layers size={16} />
              Explore Features
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="hero-stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            {STATS.map((stat, i) => (
              <div className="hero-stat" key={i}>
                <div className="hero-stat-value">{stat.value}</div>
                <div className="hero-stat-label">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right 3D Spline model */}
        <motion.div
          className="hero-spline-section"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
        >
          <div className="hero-spline-wrapper">
            {!splineLoaded && (
              <div className="hero-spline-loader">
                <div className="hero-spline-spinner" />
                <span>Loading 3D Model...</span>
              </div>
            )}
            <Suspense
              fallback={
                <div className="hero-spline-loader">
                  <div className="hero-spline-spinner" />
                  <span>Loading 3D Model...</span>
                </div>
              }
            >
              <Spline
                scene="https://prod.spline.design/qdAlySqpNJkFk6gh/scene.splinecode"
                onLoad={() => setSplineLoaded(true)}
                style={{ width: '100%', height: '100%' }}
              />
            </Suspense>
            {/* Glow ring behind the model */}
            <div className="hero-spline-glow" />
          </div>
        </motion.div>
      </div>

      {/* Features section */}
      <section className="hero-features-section" id="features">
        <motion.div
          className="hero-section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
        >
          <div className="hero-section-badge">
            <Activity size={12} />
            Core Capabilities
          </div>
          <h2 className="hero-section-title">Intelligent Threat Detection Pipeline</h2>
          <p className="hero-section-subtitle">
            End-to-end anomaly detection from raw ERA5 reanalysis data to explainable, actionable alerts
          </p>
        </motion.div>

        <div className="hero-features-grid">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              className="hero-feature-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
            >
              <div
                className="hero-feature-icon"
                style={{ background: feature.gradient }}
              >
                {feature.icon}
              </div>
              <h3 className="hero-feature-title">{feature.title}</h3>
              <p className="hero-feature-desc">{feature.desc}</p>
              <div className="hero-feature-glow" style={{ background: feature.gradient }} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tech architecture section */}
      <section className="hero-arch-section" id="tech">
        <motion.div
          className="hero-section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
        >
          <div className="hero-section-badge">
            <Cpu size={12} />
            Architecture
          </div>
          <h2 className="hero-section-title">Built for Production Scale</h2>
        </motion.div>

        <motion.div
          className="hero-pipeline"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          {[
            { label: 'ERA5 Data', sub: 'CDS API + Zarr', icon: <Globe size={18} /> },
            { label: 'Feature Engine', sub: 'Z-scores + SST', icon: <Layers size={18} /> },
            { label: 'VAE + IsoForest', sub: 'Ensemble Fusion', icon: <Cpu size={18} /> },
            { label: 'SHAP + Gemini', sub: 'Explainability', icon: <BarChart3 size={18} /> },
            { label: 'Deck.gl Map', sub: 'Visualization', icon: <Globe size={18} /> },
          ].map((step, i) => (
            <motion.div
              key={i}
              className="hero-pipeline-step"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 * i }}
            >
              <div className="hero-pipeline-icon">{step.icon}</div>
              <div className="hero-pipeline-label">{step.label}</div>
              <div className="hero-pipeline-sub">{step.sub}</div>
              {i < 4 && <div className="hero-pipeline-arrow"><ChevronRight size={16} /></div>}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Footer */}
      <section className="hero-cta-section">
        <motion.div
          className="hero-cta-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="hero-cta-title">Ready to Monitor Climate Threats?</h2>
          <p className="hero-cta-text">
            Access real-time anomaly detection with explainable AI insights
          </p>
          <button className="hero-btn-primary hero-btn-lg" onClick={onEnterDashboard}>
            <Zap size={20} />
            Enter Dashboard
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="hero-footer">
        <div className="hero-footer-content">
          <span>© 2026 ClimateGuard AI — Spatiotemporal Climate Anomaly Detection System</span>
          <span className="hero-footer-tech">FastAPI · PyTorch · deck.gl · Gemini</span>
        </div>
      </footer>
    </div>
  );
}
