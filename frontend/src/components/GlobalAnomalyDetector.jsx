/**
 * GlobalAnomalyDetector — Global city search + z-score climate anomaly detection
 * Uses Open-Meteo APIs (Geocoding + Forecast + Archive) for real weather data.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, ArrowLeft, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Globe, Activity, Clock, X, Loader2, Sparkles,
  BarChart3, RefreshCw, Navigation, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  searchCities, fetchCurrentWeather, fetchHistoricalNormals,
  computeZScores, getOverallStatus, getSeverityConfig,
} from '../utils/openMeteoApi.js';

/* ── Sparkline ─────────────────────────────────────────── */
function Sparkline({ data, color, width = 100, height = 28 }) {
  const filtered = (data || []).filter(v => v !== null);
  if (filtered.length < 2) return null;
  const min = Math.min(...filtered), max = Math.max(...filtered), range = max - min || 1;
  const pts = filtered.map((v, i) => {
    const x = (i / (filtered.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" points={pts.join(' ')} />
      <circle cx={width} cy={height - ((filtered.at(-1) - min) / range) * (height - 4) - 2} r="2.5" fill={color} />
    </svg>
  );
}

/* ── Z-Score Gauge ─────────────────────────────────────── */
function ZScoreGauge({ zScore, color }) {
  const clamped = Math.max(-4, Math.min(4, zScore || 0));
  const pct = ((clamped + 4) / 8) * 100;
  return (
    <div className="mt-3">
      <div className="relative h-1.5 bg-white/5 rounded-full overflow-visible">
        <div className="absolute left-[37.5%] w-1/4 h-full bg-emerald-500/15 rounded-full" />
        <motion.div
          className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2"
          initial={{ left: '50%' }} animate={{ left: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[0.6rem] font-mono text-white/20">
        <span>-4σ</span><span>0</span><span>+4σ</span>
      </div>
    </div>
  );
}

/* ── Variable Card ─────────────────────────────────────── */
function VariableCard({ a, index }) {
  const cfg = getSeverityConfig(a.severity);
  const isAnomaly = a.zScore !== null && Math.abs(a.zScore) >= 1.0;
  const dir = a.zScore > 0 ? 'above' : a.zScore < 0 ? 'below' : 'at';
  const dirColor = dir === 'above' ? 'text-red-400' : dir === 'below' ? 'text-blue-400' : 'text-emerald-400';

  return (
    <motion.div
      className="relative p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      {/* accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: cfg.gradient }} />

      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{a.icon}</span>
          <div>
            <div className="text-sm font-semibold text-white/85">{a.label}</div>
            <div className="text-[0.65rem] font-mono text-white/35">{a.unit}</div>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded text-[0.58rem] font-bold uppercase tracking-wider border ${cfg.twBg} ${cfg.tw} ${cfg.twBorder}`}>
          {cfg.label}
        </span>
      </div>

      {/* value */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold font-mono tracking-tight" style={{ color: isAnomaly ? cfg.color : undefined }}>
            {a.currentValue !== 'N/A' ? a.currentValue : '—'}
          </span>
          <span className="text-xs text-white/40">{a.unit}</span>
        </div>
        {a.deviation !== null && (
          <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${dirColor}`}>
            {dir === 'above' ? <TrendingUp size={13}/> : dir === 'below' ? <TrendingDown size={13}/> : <Minus size={13}/>}
            {dir === 'above' ? '+' : ''}{a.deviation}
          </div>
        )}
      </div>

      {/* comparison stats */}
      {a.historicalMean !== null && (
        <div className="flex gap-4 mb-3 flex-wrap">
          {[['Hist. Avg', `${a.historicalMean} ${a.unit}`], ['Std Dev', `±${a.historicalStd}`], ['Z-Score', `${a.zScore > 0 ? '+' : ''}${a.zScore}σ`]].map(([lbl, val], i) => (
            <div key={lbl} className="flex flex-col gap-0.5">
              <span className="text-[0.58rem] text-white/30 uppercase tracking-wider">{lbl}</span>
              <span className={`text-xs font-mono ${i === 2 ? 'font-bold' : 'text-white/70'}`} style={i === 2 ? { color: cfg.color } : undefined}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {a.zScore !== null && <ZScoreGauge zScore={a.zScore} color={cfg.color} />}

      {a.recentTrend?.length > 0 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04]">
          <span className="text-[0.6rem] text-white/25 uppercase tracking-wider">7-day trend</span>
          <Sparkline data={a.recentTrend} color={a.color} />
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Component ────────────────────────────────────── */
export default function GlobalAnomalyDetector({ onBack }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const dropRef = useRef(null);

  const [selectedLoc, setSelectedLoc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gad-recent') || '[]'); } catch { return []; }
  });

  // debounced search
  const onInput = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); setShowDrop(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchCities(val, 8);
        setResults(r); setShowDrop(r.length > 0);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, []);

  // run analysis
  const analyze = useCallback(async (loc) => {
    setShowDrop(false);
    setQuery(`${loc.name}, ${loc.country || ''}`);
    setSelectedLoc(loc); setAnalyzing(true); setError(''); setAnalysis(null);
    try {
      const [cur, hist] = await Promise.all([
        fetchCurrentWeather(loc.latitude, loc.longitude),
        fetchHistoricalNormals(loc.latitude, loc.longitude, 5),
      ]);
      const analyses = computeZScores(cur, hist);
      const overall = getOverallStatus(analyses);
      const res = { location: loc, analyses, overall, timestamp: new Date().toISOString() };
      setAnalysis(res);
      // save recent
      const item = { city: loc.name, country: loc.country || '', overall, location: loc };
      setRecent(prev => {
        const upd = [item, ...prev.filter(r => r.city !== loc.name || r.country !== (loc.country || ''))].slice(0, 8);
        localStorage.setItem('gad-recent', JSON.stringify(upd));
        return upd;
      });
    } catch (e) {
      setError(e.message || 'Analysis failed. Please retry.');
    } finally { setAnalyzing(false); }
  }, []);

  // click outside
  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const overCfg = analysis ? getSeverityConfig(analysis.overall) : null;
  const anomCount = analysis ? analysis.analyses.filter(a => a.zScore !== null && Math.abs(a.zScore) >= 1).length : 0;

  return (
    <div className="min-h-screen bg-space-900 text-white font-sans flex flex-col" id="global-anomaly-detector">

      {/* ── Header ── */}
      <motion.header
        className="flex items-center justify-between px-6 h-14 bg-space-900/95 backdrop-blur-xl border-b border-white/[0.06] shrink-0 z-50"
        initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all">
            <ArrowLeft size={16} />
          </button>
          <Globe size={18} className="text-neon-cyan animate-pulse" />
          <div>
            <span className="font-display text-sm font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
              Global Anomaly Detector
            </span>
            <span className="hidden md:block text-[0.62rem] text-white/35">Real-time climate analysis for any city worldwide</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-cyan/[0.08] border border-neon-cyan/20 text-neon-cyan text-[0.65rem] font-mono">
          <Activity size={11} /> Open-Meteo API
        </div>
      </motion.header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-[1100px] mx-auto w-full">

        {/* Search */}
        <motion.div className="relative mb-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 text-white/30 pointer-events-none z-10" />
            <input
              type="text" id="gad-city-search" value={query}
              onChange={e => onInput(e.target.value)}
              onFocus={() => results.length > 0 && setShowDrop(true)}
              placeholder="Search any city worldwide… (e.g. Tokyo, London, São Paulo)"
              className="w-full pl-12 pr-20 py-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/25 outline-none focus:border-neon-cyan/50 focus:ring-4 focus:ring-neon-cyan/[0.08] transition-all text-base"
            />
            {searching && <Loader2 size={16} className="absolute right-12 text-neon-cyan animate-spin" />}
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setShowDrop(false); }} className="absolute right-4 w-7 h-7 rounded-md bg-white/[0.06] text-white/40 hover:bg-white/[0.12] hover:text-white flex items-center justify-center transition-all">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {showDrop && results.length > 0 && (
              <motion.div ref={dropRef}
                className="absolute top-[calc(100%+6px)] left-0 right-0 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden z-[200]"
                style={{ background: '#070B1A', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              >
                {results.map((r, i) => (
                  <button key={r.id || i} onClick={() => analyze(r)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors border-b border-white/[0.04] last:border-0 text-white"
                    style={{ background: 'transparent', color: '#f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,243,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <MapPin size={14} className="text-neon-cyan shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{r.name}</div>
                      <div className="text-[0.68rem]" style={{ color: 'rgba(255,255,255,0.4)' }}>{[r.admin1, r.country].filter(Boolean).join(', ')}</div>
                    </div>
                    <span className="text-[0.65rem] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{r.latitude?.toFixed(2)}°, {r.longitude?.toFixed(2)}°</span>
                    <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.15)' }} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Analyzing */}
        <AnimatePresence mode="wait">
          {analyzing && (
            <motion.div key="spin" className="flex justify-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center max-w-sm">
                <Loader2 size={36} className="mx-auto mb-5 text-neon-cyan animate-spin" />
                <h3 className="text-lg font-bold mb-2">Analyzing Climate Patterns</h3>
                <p className="text-sm text-white/50">Fetching current weather & 5-year historical data for <strong className="text-white/80">{selectedLoc?.name}</strong>…</p>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && !analyzing && (
            <motion.div key="err" className="flex items-center gap-3 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/25 text-red-300 text-sm mb-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <AlertTriangle size={18} /><span className="flex-1">{error}</span>
              <button onClick={() => selectedLoc && analyze(selectedLoc)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs hover:bg-red-500/20 transition-colors whitespace-nowrap">
                <RefreshCw size={12} /> Retry
              </button>
            </motion.div>
          )}

          {/* Results */}
          {analysis && !analyzing && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

              {/* Status banner */}
              <motion.div
                className="flex flex-wrap items-center justify-between gap-5 p-6 rounded-2xl border mb-6"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                style={{ borderColor: overCfg.borderColor, background: `linear-gradient(135deg, ${overCfg.bgColor}, rgba(2,4,18,0.95))` }}
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-3">
                    <MapPin size={18} style={{ color: overCfg.color }} />
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight">{analysis.location.name}</h2>
                      <span className="text-sm text-white/45">{[analysis.location.admin1, analysis.location.country].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[0.68rem] font-mono text-white/30">
                    <Navigation size={11} />
                    {analysis.location.latitude?.toFixed(4)}°N, {analysis.location.longitude?.toFixed(4)}°E
                    {analysis.location.elevation && <span className="pl-2 border-l border-white/10">{analysis.location.elevation}m elev.</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-white" style={{ background: overCfg.gradient }}>
                    <span className="text-2xl">{overCfg.emoji}</span>
                    <div>
                      <span className="block text-base font-extrabold tracking-wider">{overCfg.label}</span>
                      <span className="block text-[0.68rem] opacity-85">
                        {anomCount > 0 ? `${anomCount} anomal${anomCount === 1 ? 'y' : 'ies'} detected` : 'No anomalies detected'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.65rem] font-mono text-white/30">
                    <Clock size={11} />{new Date(analysis.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>

              {/* Variable cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {analysis.analyses.map((a, i) => <VariableCard key={a.key} a={a} index={i} />)}
              </div>

              {/* Summary */}
              <motion.div className="p-5 rounded-2xl bg-neon-purple/[0.04] border border-neon-purple/[0.12] mb-6"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-2.5 text-sm font-semibold text-neon-purple/80">
                  <Sparkles size={15} /> Analysis Summary
                </div>
                <p className="text-sm leading-relaxed text-white/55">
                  {anomCount === 0 ? (
                    <>All climate variables for <strong className="text-white/80">{analysis.location.name}</strong> are within normal ranges compared to the 5-year historical baseline.</>
                  ) : (
                    <><strong className="text-white/80">{anomCount}</strong> variable{anomCount > 1 ? 's' : ''} in <strong className="text-white/80">{analysis.location.name}</strong> {anomCount > 1 ? 'show' : 'shows'} significant deviation. {analysis.analyses.filter(a => a.zScore !== null && Math.abs(a.zScore) >= 1.5).map(a => `${a.label} is ${Math.abs(a.zScore).toFixed(1)}σ ${a.zScore > 0 ? 'above' : 'below'} average`).join('; ')}.</>
                  )}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!analysis && !analyzing && !error && (
          <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="relative w-28 h-28 mx-auto mb-7 flex items-center justify-center">
              <div className="absolute inset-0 border border-neon-cyan/15 rounded-full animate-[spin_12s_linear_infinite]" />
              <div className="absolute inset-3 border border-dashed border-neon-purple/12 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
              <div className="absolute inset-7 border border-neon-cyan/10 rounded-full animate-[spin_15s_linear_infinite]" />
              <Globe size={40} className="text-neon-cyan/50" />
            </div>
            <h3 className="text-xl font-bold text-white/80 mb-2">Search Any City Worldwide</h3>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-6 leading-relaxed">
              Enter a city name above to analyze its current climate conditions against 5-year historical normals using z-score anomaly detection.
            </p>
            <div className="flex items-center gap-2 justify-center flex-wrap">
              <span className="text-xs text-white/30 font-medium">Try:</span>
              {['Tokyo', 'New York', 'London', 'Dubai', 'Sydney', 'Mumbai'].map(c => (
                <button key={c} onClick={() => { onInput(c); setQuery(c); }}
                  className="px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/55 text-xs hover:bg-neon-cyan/10 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all"
                >{c}</button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent */}
        {recent.length > 0 && (
          <motion.div className="mt-2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center gap-2 text-[0.7rem] font-semibold text-white/40 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.04]">
              <Clock size={13} /> Recent Searches
              <button onClick={() => { setRecent([]); localStorage.removeItem('gad-recent'); }}
                className="ml-auto text-[0.62rem] text-white/30 hover:text-white/60 normal-case tracking-normal font-normal px-2.5 py-1 rounded border border-white/[0.06] bg-transparent transition-all"
              >Clear</button>
            </div>
            <div className="flex flex-col gap-1.5">
              {recent.map((r, i) => {
                const rc = getSeverityConfig(r.overall);
                return (
                  <button key={`${r.city}-${i}`} onClick={() => analyze(r.location)}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] text-left transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-white/30" />
                      <span className="font-semibold text-sm">{r.city}</span>
                      <span className="text-[0.68rem] text-white/35">{r.country}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[0.58rem] font-bold border ${rc.twBg} ${rc.tw} ${rc.twBorder}`}>
                      {rc.emoji} {rc.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
