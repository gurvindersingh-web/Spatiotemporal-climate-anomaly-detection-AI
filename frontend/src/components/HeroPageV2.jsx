import React, { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import R3FEarth from './R3FEarth';
import { Activity, Wind, Thermometer, Satellite, ChevronRight, Globe, Layers, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HudFrame from './HudFrame';

export default function HeroPageV2({ onEnterDashboard, onEnterDetector }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-space-900 text-white font-sans selection:bg-neon-cyan selection:text-space-900">
      
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Suspense fallback={null}>
            <R3FEarth />
          </Suspense>
        </Canvas>
      </div>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-space-900/80 via-transparent to-space-900/90" />
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon-purple/10 via-transparent to-transparent opacity-50" />

      {/* HUD Edge Decorations */}
      <HudFrame />

      {/* Top Navbar */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-space-900/20 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.3)]">
            <Globe className="text-white w-6 h-6" />
          </div>
          <span className="font-display font-bold text-xl tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            ClimateGuard AI
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          {['Features', 'Analytics', 'Models'].map((item) => (
            <button key={item} className="bg-transparent border-none outline-none cursor-pointer text-sm font-medium tracking-wider text-white/60 hover:text-white uppercase transition-colors">
              {item}
            </button>
          ))}
          <button onClick={onEnterDetector} className="bg-transparent border-none outline-none cursor-pointer text-sm font-medium tracking-wider text-neon-cyan/80 hover:text-neon-cyan uppercase transition-colors flex items-center gap-1.5">
            🌍 Global Detector
          </button>
        </nav>

        <Button onClick={onEnterDashboard} className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 text-white font-display tracking-widest px-6 py-2 rounded-lg backdrop-blur-md transition-all hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:border-neon-cyan/50">
          <span className="relative z-10 flex items-center gap-2">
            Launch Dashboard <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/10 to-neon-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </Button>
      </header>

      {/* Main Content Layout */}
      <main className="absolute inset-0 z-20 flex flex-col justify-center px-12 md:px-24 pointer-events-none mt-16">
        
        {/* Hero Text */}
        <div className="max-w-3xl pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs font-mono mb-6 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              Live Telemetry Active
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              AI-Powered <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-purple drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]">
                Climate Intelligence
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-xl font-light leading-relaxed mb-10 border-l-2 border-neon-cyan/30 pl-6">
              Detect anomalies, monitor environmental risk, and predict global climate threats in real-time with our spatiotemporal neural ensemble.
            </p>
            
            <div className="flex items-center gap-4">
              <Button onClick={onEnterDashboard} className="h-12 px-8 bg-neon-blue hover:bg-neon-cyan text-white border-none rounded-lg font-display tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all">
                Explore Platform
              </Button>
              <Button variant="ghost" onClick={onEnterDetector} className="h-12 px-8 text-white/70 hover:text-white hover:bg-white/5 font-display tracking-widest uppercase">
                🌍 Global Detector
              </Button>
            </div>
          </motion.div>
        </div>

      </main>

      {/* Floating Stats Cards - Right Side */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4 pointer-events-auto">
        
        <StatsCard 
          icon={<Thermometer className="w-5 h-5 text-red-400" />}
          title="Temp Anomaly"
          value="+1.42°C"
          trend="Critical"
          trendColor="text-red-400"
          delay={0.2}
        />
        <StatsCard 
          icon={<Wind className="w-5 h-5 text-orange-400" />}
          title="CO₂ Trend"
          value="421 ppm"
          trend="+2.1% YOY"
          trendColor="text-orange-400"
          delay={0.4}
        />
        <StatsCard 
          icon={<AlertCircle className="w-5 h-5 text-neon-purple" />}
          title="Storm Risk Index"
          value="Elevated"
          trend="Watch Active"
          trendColor="text-neon-purple"
          delay={0.6}
        />
        <StatsCard 
          icon={<Satellite className="w-5 h-5 text-neon-cyan" />}
          title="Satellite Feeds"
          value="Active (4)"
          trend="Syncing..."
          trendColor="text-neon-cyan"
          delay={0.8}
        />

      </div>

      {/* Bottom Timeline / Pipeline */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-8 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="max-w-4xl mx-auto backdrop-blur-xl bg-space-900/40 border border-white/5 rounded-2xl p-6 flex items-center justify-between shadow-2xl relative overflow-hidden"
        >
          {/* Animated Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50" />
          
          <PipelineStep icon={<Satellite />} label="Ingestion" active />
          <PipelineDivider />
          <PipelineStep icon={<Layers />} label="Processing" active />
          <PipelineDivider />
          <PipelineStep icon={<Activity />} label="Detection" />
          <PipelineDivider />
          <PipelineStep icon={<Globe />} label="Prediction" />
        </motion.div>
      </div>

    </div>
  );
}

function StatsCard({ icon, title, value, trend, trendColor, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
      whileHover={{ scale: 1.05, x: -10 }}
      className="w-64 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 shadow-2xl cursor-pointer group hover:border-white/20 transition-colors relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors" />
      
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          {icon}
        </div>
        <span className="font-display uppercase text-xs tracking-wider text-white/50 font-semibold">{title}</span>
      </div>
      <div className="relative z-10 flex items-baseline justify-between">
        <span className="font-mono text-2xl font-bold">{value}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${trendColor}`}>{trend}</span>
      </div>
    </motion.div>
  );
}

function PipelineStep({ icon, label, active }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${active ? 'text-neon-cyan' : 'text-white/30'}`}>
      <div className={`p-3 rounded-xl border ${active ? 'bg-neon-cyan/10 border-neon-cyan/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]' : 'bg-white/5 border-white/10'} relative`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
        {active && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neon-cyan animate-ping" />}
      </div>
      <span className="font-display text-xs uppercase tracking-widest font-semibold">{label}</span>
    </div>
  );
}

function PipelineDivider() {
  return (
    <div className="flex-1 h-[1px] mx-4 relative bg-white/10">
      <motion.div 
        animate={{ x: ["0%", "100%"] }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50"
      />
    </div>
  );
}
