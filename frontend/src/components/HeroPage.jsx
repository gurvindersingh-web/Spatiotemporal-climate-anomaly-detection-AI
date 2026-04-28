import { Suspense, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import Galaxy from './Galaxy/Galaxy';
import GradientText from './GradientText/GradientText';
import { Button } from '@/components/ui/button';

const SPLINE_URL = 'https://prod.spline.design/qdAlySqpNJkFk6gh/scene.splinecode';


export default function HeroPage({ onEnterDashboard }) {
  const [activeNav, setActiveNav] = useState(null);
  const navRef = useRef(null);

  /* Lock scroll */
  useEffect(() => {
    document.body.style.overflow            = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow            = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  /* Click outside closes dropdown */
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveNav(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleNav = (label) => setActiveNav(prev => prev === label ? null : label);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      width: '100vw', height: '100vh',
      overflow: 'hidden',
      fontFamily: "'Rajdhani','Orbitron',sans-serif",
      background: '#04021a',
    }}>

      {/* ── L0: Galaxy star-field ── */}
      <div style={{ position:'absolute', inset:0, zIndex:0 }}>
        <Galaxy
          mouseInteraction={true}
          mouseRepulsion={true}
          repulsionStrength={1.8}
          density={1.0}
          glowIntensity={0.28}
          saturation={0.12}
          hueShift={218}
          twinkleIntensity={0.35}
          rotationSpeed={0.04}
          starSpeed={0.30}
          speed={0.7}
          transparent={false}
          focal={[0.5, 0.5]}
          rotation={[1.0, 0.0]}
        />
      </div>

      {/* ── L1: CSS background nebula — no canvas, no blur ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: [
          /* Rich violet nebula upper-right */
          'radial-gradient(ellipse 65% 55% at 68% 35%, rgba(38,6,95,0.72) 0%, transparent 70%)',
          /* Deep navy upper-left */
          'radial-gradient(ellipse 50% 45% at 18% 28%, rgba(4,8,55,0.60) 0%, transparent 65%)',
          /* Dark bottom fill so Earth pops */
          'radial-gradient(ellipse 80% 40% at 50% 100%, rgba(2,1,12,0.55) 0%, transparent 60%)',
        ].join(','),
        pointerEvents: 'none',
      }} />

      {/* ── L2: Spline 3D Earth — CLEAR, no canvas on top ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          /* Scale so Earth arc fills lower half, translateY crops top of globe */
          transform: 'scale(4.2) translateY(29%)',
          transformOrigin: 'center center',
        }}>
          <Suspense fallback={null}>
            <Spline scene={SPLINE_URL} style={{ width:'100%', height:'100%' }} />
          </Suspense>
        </div>
      </div>


      {/* ── L4: HUD frame ── */}
      <HudFrame />

      {/* ── L5: Navigation bar ── */}
      <motion.div
        ref={navRef}
        initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:1, delay:0.3 }}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          zIndex: 30,
          pointerEvents: 'auto',
        }}
      >
        {/* Bar */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 52px',
          background: 'linear-gradient(to bottom,rgba(4,2,26,0.80) 0%,rgba(4,2,26,0.20) 100%)',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width: 28, height: 28,
              border: '1px solid rgba(180,210,255,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(180,210,255,0.06)',
            }}>
              <div style={{ width:10, height:10, borderRadius:'50%',
                background:'rgba(180,210,255,0.7)',
                boxShadow:'0 0 8px 2px rgba(100,180,255,0.5)' }} />
            </div>
            <span style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: 'clamp(0.6rem,1vw,0.75rem)',
              fontWeight: 700, letterSpacing: '0.22em',
              color: 'rgba(180,210,255,0.90)',
              textTransform: 'uppercase',
            }}>ClimateGuard AI</span>
          </div>

          {/* Nav links — colored accent buttons */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {[
              { label:'Features', clr:'0,212,255',   hex:'#00d4ff' },   /* electric cyan   */
              { label:'About',    clr:'168,100,255',  hex:'#a864ff' },   /* violet-purple   */
              { label:'Contact',  clr:'64,148,255',   hex:'#4094ff' },   /* royal blue      */
            ].map(({ label, clr, hex }) => {
              const isActive = activeNav === label;
              return (
                <motion.button
                  key={label}
                  onClick={() => toggleNav(label)}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    fontFamily: "'Orbitron',sans-serif",
                    fontSize: '0.58rem', fontWeight: 700,
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: isActive ? '#fff' : `rgba(${clr},0.80)`,
                    padding: '7px 20px',
                    border: `1px solid rgba(${clr},${isActive ? 0.75 : 0.35})`,
                    background: isActive
                      ? `rgba(${clr},0.18)`
                      : `rgba(${clr},0.06)`,
                    backdropFilter: 'blur(6px)',
                    boxShadow: isActive
                      ? `0 0 18px rgba(${clr},0.28), inset 0 0 12px rgba(${clr},0.12)`
                      : `0 0 0px rgba(${clr},0)`,
                    transition: 'all 0.22s ease',
                    borderRadius: 2,
                  }}
                  whileHover={{
                    color: '#fff',
                    borderColor: `rgba(${clr},0.65)`,
                    background: `rgba(${clr},0.14)`,
                    boxShadow: `0 0 14px rgba(${clr},0.22)`,
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {label}
                  {/* Active bottom glow line */}
                  <motion.span
                    style={{
                      position: 'absolute', bottom: -1, left: '15%', right: '15%', height: 1,
                      background: `linear-gradient(to right,transparent,${hex},transparent)`,
                      originX: 0.5,
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.22 }}
                  />
                  {/* Active corner dot */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-dot"
                      style={{
                        position: 'absolute', top: 4, right: 5,
                        width: 3, height: 3, borderRadius: '50%',
                        background: hex,
                        boxShadow: `0 0 5px 2px rgba(${clr},0.7)`,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>


          {/* Dashboard CTA */}
          <Button
            variant="secondary" size="sm"
            id="nav-dashboard-btn"
            onClick={onEnterDashboard}
          >Dashboard</Button>
        </nav>

        {/* Dropdown panel */}
        <AnimatePresence>
          {activeNav && (
            <NavPanel activeNav={activeNav} onClose={() => setActiveNav(null)} />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── L5: PLANET / EARTH — animated gradient title ── */}
      <motion.div
        initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:1.1, delay:0.5 }}
        style={{
          position: 'absolute',
          top: '22%', left: '42%',
          zIndex: 20, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column',
          gap: 0,
        }}
      >
        {['PLANET', 'EARTH'].map((word, idx) => (
          <GradientText
            key={word}
            colors={[
              '#b4d2ff',  /* soft blue-white */
              '#ffffff',  /* pure white */
              '#7eb8ff',  /* mid blue */
              '#c8aaff',  /* violet */
              '#ffffff',  /* white for seamless loop */
            ]}
            animationSpeed={idx === 0 ? 5 : 7}
            direction="horizontal"
            yoyo={true}
            pauseOnHover={false}
            showBorder={false}
            className="hero-gradient-word"
          >
            <span style={{
              fontSize: 'clamp(3.2rem,6.5vw,6.5rem)',
              fontFamily: "'Orbitron','Rajdhani',sans-serif",
              fontWeight: 700,
              letterSpacing: '0.15em',
              lineHeight: 1.10,
              display: 'block',
            }}>{word}</span>
          </GradientText>
        ))}
      </motion.div>

      {/* ── L5: Info block — lower left ── */}
      <motion.div
        initial={{ opacity:0, x:-14 }} animate={{ opacity:1, x:0 }}
        transition={{ duration:1, delay:0.85 }}
        style={{
          position: 'absolute',
          bottom: '30%', left: '7%',
          zIndex: 20, maxWidth: 290,
        }}
      >
        <div style={{
          fontFamily: "'Orbitron',sans-serif",
          fontSize: 'clamp(0.54rem,0.88vw,0.66rem)',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'rgba(180,210,255,0.90)',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(180,210,255,0.40)',
          paddingBottom: 3, marginBottom: 5,
          display: 'inline-block',
        }}>A CYBERSECURITY TRAINING</div>

        <div style={{
          fontFamily: "'Orbitron',sans-serif",
          fontSize: 'clamp(0.44rem,0.7vw,0.56rem)',
          letterSpacing: '0.15em',
          color: 'rgba(180,210,255,0.50)',
          marginBottom: 9,
        }}>WE ARE THE FUTURE</div>

        {[
          'Gamify cybersecurity instruction',
          "Help with teaching the future of today's Cybersecurity",
          'Education through competitive labs and scenarios',
        ].map((t, i) => (
          <div key={i} style={{
            fontSize: 'clamp(0.44rem,0.70vw,0.56rem)',
            color: 'rgba(180,210,255,0.40)',
            letterSpacing: '0.02em', lineHeight: 1.7,
            fontFamily: "'Rajdhani',sans-serif",
          }}>{t}</div>
        ))}

        {/* Right-side glowing vertical divider */}
        <div style={{
          position: 'absolute', right: -14, top: 0, bottom: 0,
          width: 1,
          background: 'linear-gradient(to bottom,transparent,rgba(180,210,255,0.30),transparent)',
        }} />
      </motion.div>

      {/* ── L5: Enter button — default (primary HUD) variant ── */}
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }}
        transition={{ duration:0.9, delay:1.5 }}
        whileHover={{ scale:1.04 }}
        whileTap={{ scale:0.97 }}
        style={{
          position: 'absolute',
          bottom: '6%', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
        }}
      >
        <Button
          variant="default"
          size="lg"
          id="enter-system-btn"
          onClick={onEnterDashboard}
        >ENTER SYSTEM</Button>
      </motion.div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HUD FRAME — replicates the reference image precisely
══════════════════════════════════════════════════════════ */
function HudFrame() {
  const lc = 'rgba(180,210,255,0.22)'; /* line colour */

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }}
      transition={{ duration:1.8, delay:0.2 }}
      style={{ position:'absolute', inset:0, zIndex:15, pointerEvents:'none' }}
    >
      {/* Thin outer border */}
      <div style={{
        position:'absolute', inset:10,
        border:'1px solid rgba(180,210,255,0.08)',
      }} />

      {/* ── TOP HUD ── */}
      <TopHud lc={lc} />

      {/* ── BOTTOM centre small bar ── */}
      <div style={{
        position:'absolute', bottom:10, left:'50%',
        transform:'translateX(-50%)',
        display:'flex', alignItems:'center',
      }}>
        <div style={{ width:60, height:1, background:lc }} />
        <div style={{ width:32, height:7,
          borderLeft:`1px solid ${lc}`, borderRight:`1px solid ${lc}` }} />
        <div style={{ width:60, height:1, background:lc }} />
      </div>

      {/* ── CORNER brackets ── */}
      {['tl','tr','bl','br'].map(p => <Corner key={p} pos={p} lc={lc} />)}

      {/* ── SIDE columns ── */}
      <SideColumn side="left"  lc={lc} />
      <SideColumn side="right" lc={lc} />
    </motion.div>
  );
}

/* Top HUD: centre stepped panel + horizontal circuit traces */
function TopHud({ lc }) {
  return (
    <div style={{
      position:'absolute', top:0, left:0, right:0,
      height:72, display:'flex', alignItems:'flex-start',
    }}>

      {/* Left trace */}
      <div style={{ flex:1, paddingLeft:55, paddingTop:12, display:'flex', flexDirection:'column', gap:7 }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          <div style={{ width:'38%', height:1, background:lc }} />
          <div style={{ width:1, height:14, background:lc }} />
          <div style={{ flex:1, height:1, background:'rgba(180,210,255,0.11)' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', marginLeft:'10%' }}>
          <div style={{ width:'22%', height:1, background:'rgba(180,210,255,0.12)' }} />
          <div style={{ width:1, height:8, background:'rgba(180,210,255,0.12)' }} />
          <div style={{ width:'18%', height:1, background:'rgba(180,210,255,0.12)' }} />
        </div>
      </div>

      {/* Centre stepped panel */}
      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center' }}>
        {/* Top notch */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:3 }}>
          <div style={{ width:26, height:7, border:`1px solid ${lc}`, borderBottom:'none',
            background:'rgba(180,210,255,0.06)' }} />
          <div style={{ width:78, height:12, border:`1px solid ${lc}`, borderBottom:'none',
            background:'rgba(180,210,255,0.05)' }} />
          <div style={{ width:26, height:7, border:`1px solid ${lc}`, borderBottom:'none',
            background:'rgba(180,210,255,0.06)' }} />
        </div>
        {/* Main bar */}
        <div style={{
          width:200, height:20, border:`1px solid ${lc}`,
          background:'rgba(180,210,255,0.05)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:9,
        }}>
          <div style={{ width:18, height:2, background:'rgba(180,210,255,0.45)' }} />
          <div style={{ width:40, height:2, background:'rgba(180,210,255,0.60)' }} />
          <div style={{ width:18, height:2, background:'rgba(180,210,255,0.45)' }} />
        </div>
        {/* Tail */}
        <div style={{
          width:120, height:7,
          borderLeft:`1px solid rgba(180,210,255,0.18)`,
          borderRight:`1px solid rgba(180,210,255,0.18)`,
          borderBottom:`1px solid rgba(180,210,255,0.18)`,
          background:'rgba(180,210,255,0.03)',
        }} />
      </div>

      {/* Right trace (mirrored) */}
      <div style={{ flex:1, paddingRight:55, paddingTop:12, display:'flex', flexDirection:'column', gap:7, alignItems:'flex-end' }}>
        <div style={{ display:'flex', alignItems:'center', width:'100%', justifyContent:'flex-end' }}>
          <div style={{ flex:1, height:1, background:'rgba(180,210,255,0.11)' }} />
          <div style={{ width:1, height:14, background:lc }} />
          <div style={{ width:'38%', height:1, background:lc }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', marginRight:'10%' }}>
          <div style={{ width:'18%', height:1, background:'rgba(180,210,255,0.12)' }} />
          <div style={{ width:1, height:8, background:'rgba(180,210,255,0.12)' }} />
          <div style={{ width:'22%', height:1, background:'rgba(180,210,255,0.12)' }} />
        </div>
      </div>
    </div>
  );
}

/* L-shaped corner bracket */
function Corner({ pos, lc }) {
  const sz = 22, b = `1px solid ${lc}`;
  const isT = pos[0]==='t', isL = pos[1]==='l';
  return (
    <div style={{
      position:'absolute',
      top:    isT ? 10 : undefined, bottom: !isT ? 10 : undefined,
      left:   isL ? 10 : undefined, right:  !isL ? 10 : undefined,
      width:sz, height:sz,
      borderTop:    isT ? b : 'none',
      borderBottom: !isT ? b : 'none',
      borderLeft:   isL ? b : 'none',
      borderRight:  !isL ? b : 'none',
    }} />
  );
}

/* ── Full-height side panel matching reference image ── */
function SideColumn({ side, lc }) {
  const isL = side === 'left';
  /* viewBox coordinate space: 64 wide × 730 tall */
  const W = 64, H = 730;
  const cx = W / 2; // horizontal centre = 32

  /* Outer border x */
  const bx = isL ? W - 4 : 4;

  /* Main arc — sweeps like a parenthesis from top to bottom */
  const arcMain = isL
    ? `M ${cx},18 C ${W-4},110 ${W-2},260 ${W-2},${H/2} C ${W-2},${H-260} ${W-4},${H-110} ${cx},${H-18}`
    : `M ${cx},18 C 4,110 2,260 2,${H/2} C 2,${H-260} 4,${H-110} ${cx},${H-18}`;

  /* Secondary inner arc */
  const arcInner = isL
    ? `M ${cx},120 C ${W-10},200 ${W-8},290 ${W-8},${H/2} C ${W-8},${H-290} ${W-10},${H-200} ${cx},${H-120}`
    : `M ${cx},120 C 10,200 8,290 8,${H/2} C 8,${H-290} 10,${H-200} ${cx},${H-120}`;

  /* Cross-hair positions */
  const crossYs = [H*0.22, H*0.50, H*0.78];

  /* Bracket pairs flanking the central orb */
  const bk = isL ? { x1:W-12, x2:W-4 } : { x1:12, x2:4 };

  return (
    <div style={{
      position: 'absolute',
      [isL ? 'left' : 'right']: 0,
      top: 0, bottom: 0,
      width: W,
      pointerEvents: 'none',
    }}>
      {/* ── SVG vector overlay ── */}
      <svg
        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        {/* Outer border line */}
        <line x1={bx} y1="0" x2={bx} y2={H}
          stroke="rgba(180,210,255,0.18)" strokeWidth="0.6" />

        {/* Inner thin line */}
        <line x1={cx} y1="30" x2={cx} y2={H-30}
          stroke="rgba(180,210,255,0.06)" strokeWidth="0.4" strokeDasharray="3 6" />

        {/* Main sweeping arc */}
        <path d={arcMain}
          stroke="rgba(180,210,255,0.26)" strokeWidth="0.9" fill="none" />

        {/* Secondary inner arc */}
        <path d={arcInner}
          stroke="rgba(180,210,255,0.14)" strokeWidth="0.65" fill="none" />

        {/* Cross-hair markers */}
        {crossYs.map((y, i) => (
          <g key={i}>
            <line x1={cx-7} y1={y} x2={cx+7} y2={y}
              stroke="rgba(180,210,255,0.38)" strokeWidth="0.8" />
            <line x1={cx} y1={y-7} x2={cx} y2={y+7}
              stroke="rgba(180,210,255,0.38)" strokeWidth="0.8" />
            {/* Small corner ticks */}
            <line x1={cx-7} y1={y-4} x2={cx-7} y2={y+4}
              stroke="rgba(180,210,255,0.22)" strokeWidth="0.5" />
            <line x1={cx+7} y1={y-4} x2={cx+7} y2={y+4}
              stroke="rgba(180,210,255,0.22)" strokeWidth="0.5" />
          </g>
        ))}

        {/* Bracket pair above orb */}
        <path d={`M ${bk.x1},${H*0.44} L ${bk.x2},${H*0.44} L ${bk.x2},${H*0.40} L ${bk.x1},${H*0.40}`}
          stroke="rgba(180,210,255,0.32)" strokeWidth="0.7" fill="none" />
        {/* Bracket pair below orb */}
        <path d={`M ${bk.x1},${H*0.56} L ${bk.x2},${H*0.56} L ${bk.x2},${H*0.60} L ${bk.x1},${H*0.60}`}
          stroke="rgba(180,210,255,0.32)" strokeWidth="0.7" fill="none" />

        {/* Diagonal tick marks — top & bottom */}
        {[[H*0.07, 1], [H*0.93, -1]].map(([y, dir], i) => (
          <line key={i}
            x1={isL ? cx+4 : cx-4} y1={y}
            x2={isL ? cx+14 : cx-14} y2={y + dir*10}
            stroke="rgba(180,210,255,0.30)" strokeWidth="0.8" />
        ))}

        {/* Small grid-square markers */}
        {[[H*0.14],[H*0.86]].map(([y], i) => (
          <rect key={i}
            x={cx-5} y={y-5} width={10} height={10}
            stroke="rgba(180,210,255,0.18)" strokeWidth="0.5" fill="none" />
        ))}

        {/* Horizontal scan lines at 1/4 and 3/4 height */}
        <line x1={isL?cx:4} y1={H*0.32} x2={bx} y2={H*0.32}
          stroke="rgba(180,210,255,0.12)" strokeWidth="0.5" />
        <line x1={isL?cx:4} y1={H*0.68} x2={bx} y2={H*0.68}
          stroke="rgba(180,210,255,0.12)" strokeWidth="0.5" />
      </svg>

      {/* ── Dot grid — upper (20% from top) ── */}
      <div style={{
        position:'absolute', top:'18%', left:'50%',
        transform:'translateX(-50%)',
      }}>
        <DotGrid3 lc={lc} />
      </div>

      {/* ── Central radar orb (50%) ── */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        display:'flex', flexDirection:'column',
        alignItems:'center', gap:8,
      }}>
        {/* Tick arm above */}
        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
          <div style={{ width:isL?16:5, height:1, background:lc }} />
          <div style={{ width:3, height:3, borderRadius:'50%', background:lc }} />
          <div style={{ width:isL?5:16, height:1, background:lc }} />
        </div>

        {/* Orb with 4 rings */}
        <div style={{ position:'relative', width:44, height:44,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {[44,33,22,12].map((d,i) => (
            <div key={i} style={{
              position:'absolute', width:d, height:d, borderRadius:'50%',
              border:`1px solid rgba(180,210,255,${0.05+i*0.08})`,
            }} />
          ))}
          <div style={{
            width:7, height:7, borderRadius:'50%',
            background:'rgba(220,235,255,0.95)',
            boxShadow:'0 0 12px 5px rgba(140,200,255,0.65)',
          }} />
        </div>

        {/* Tick arm below */}
        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
          <div style={{ width:isL?16:5, height:1, background:lc }} />
          <div style={{ width:3, height:3, borderRadius:'50%', background:lc }} />
          <div style={{ width:isL?5:16, height:1, background:lc }} />
        </div>
      </div>

      {/* ── Dot grid — lower (80% from top) ── */}
      <div style={{
        position:'absolute', top:'80%', left:'50%',
        transform:'translateX(-50%)',
      }}>
        <DotGrid3 lc={lc} />
      </div>
    </div>
  );
}

function DotGrid3({ lc }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,7px)',
      gridTemplateRows:'repeat(3,7px)', gap:4 }}>
      {Array.from({length:9}).map((_,i) => (
        <div key={i} style={{
          width:2, height:2, borderRadius:'50%',
          background:`rgba(180,210,255,${0.13+(i%3)*0.07})`,
          alignSelf:'center', justifySelf:'center',
        }} />
      ))}
    </div>
  );
}

/* Keep old DotGrid alias for backward compat */
function DotGrid({ lc }) { return <DotGrid3 lc={lc} />; }


/* ══════════════════════════════════════════════════════════
   NAV PANEL — slides down from nav bar on link click
══════════════════════════════════════════════════════════ */
const NAV_CONTENT = {
  Features: {
    heading: 'Platform Features',
    items: [
      { icon: '🌍', title: 'Real-Time Monitoring', desc: 'Track climate anomalies across the globe with sub-hourly data streams.' },
      { icon: '🤖', title: 'AI Anomaly Detection', desc: 'Spatiotemporal deep learning models flag deviations before they escalate.' },
      { icon: '🛡️', title: 'Cybersecurity Training', desc: 'Gamified labs and competitive scenarios for the next generation of defenders.' },
      { icon: '📡', title: 'Satellite Data Fusion', desc: 'Multi-source satellite imagery combined with ground-truth sensor networks.' },
    ],
  },
  About: {
    heading: 'About ClimateGuard AI',
    body: 'ClimateGuard AI is a next-generation platform that merges advanced spatiotemporal machine learning with gamified cybersecurity education. Our mission is to build a generation of climate-aware, cyber-resilient professionals equipped to tackle the dual challenges of environmental instability and digital threats.',
    stats: [
      { value: '12K+', label: 'Active Learners' },
      { value: '98%',  label: 'Detection Accuracy' },
      { value: '40+',  label: 'Countries Covered' },
      { value: '200+', label: 'Lab Scenarios' },
    ],
  },
  Contact: {
    heading: 'Get In Touch',
    fields: ['Email address', 'Message'],
    links: [
      { label: 'Email Us', href: 'mailto:contact@climateguard.ai' },
      { label: 'GitHub',   href: 'https://github.com' },
      { label: 'LinkedIn', href: 'https://linkedin.com' },
    ],
  },
};

function NavPanel({ activeNav, onClose }) {
  const lc = 'rgba(180,210,255,0.18)';
  const content = NAV_CONTENT[activeNav];

  return (
    <motion.div
      key={activeNav}
      initial={{ opacity: 0, y: -12, scaleY: 0.94 }}
      animate={{ opacity: 1, y: 0,  scaleY: 1     }}
      exit={{    opacity: 0, y: -8,  scaleY: 0.96  }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0,
        background: 'rgba(4,2,26,0.88)',
        backdropFilter: 'blur(18px)',
        borderTop: `1px solid ${lc}`,
        borderBottom: `1px solid ${lc}`,
        padding: '28px 52px 32px',
        transformOrigin: 'top',
        zIndex: 30,
      }}
    >
      {/* Panel header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:3, height:18, background:'rgba(180,210,255,0.70)',
            boxShadow:'0 0 8px rgba(100,180,255,0.5)' }} />
          <span style={{
            fontFamily:"'Orbitron',sans-serif", fontSize:'0.70rem',
            fontWeight:700, letterSpacing:'0.20em',
            color:'rgba(180,210,255,0.90)', textTransform:'uppercase',
          }}>{content.heading}</span>
        </div>
        <button onClick={onClose} style={{
          background:'none', border:`1px solid ${lc}`, cursor:'pointer',
          width:24, height:24, color:'rgba(180,210,255,0.60)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'0.7rem', fontFamily:'monospace',
          transition:'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(180,210,255,0.60)'; e.currentTarget.style.color='rgba(180,210,255,1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor=lc; e.currentTarget.style.color='rgba(180,210,255,0.60)'; }}
        >✕</button>
      </div>

      {/* ─ FEATURES ─ */}
      {activeNav === 'Features' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          {content.items.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0  }}
              transition={{ delay: i * 0.06 }}
              style={{
                padding:'16px 18px',
                border:`1px solid ${lc}`,
                background:'rgba(180,210,255,0.03)',
                cursor:'default',
                transition:'all 0.2s',
              }}
              whileHover={{ background:'rgba(180,210,255,0.07)', borderColor:'rgba(180,210,255,0.35)' }}
            >
              <div style={{ fontSize:'1.4rem', marginBottom:8 }}>{f.icon}</div>
              <div style={{
                fontFamily:"'Orbitron',sans-serif", fontSize:'0.58rem',
                fontWeight:700, letterSpacing:'0.14em',
                color:'rgba(180,210,255,0.88)', marginBottom:6,
                textTransform:'uppercase',
              }}>{f.title}</div>
              <div style={{
                fontFamily:"'Rajdhani',sans-serif", fontSize:'0.72rem',
                color:'rgba(180,210,255,0.48)', lineHeight:1.6,
              }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─ ABOUT ─ */}
      {activeNav === 'About' && (
        <div style={{ display:'flex', gap:40, alignItems:'flex-start' }}>
          <p style={{
            flex:1, fontFamily:"'Rajdhani',sans-serif", fontSize:'0.85rem',
            color:'rgba(180,210,255,0.55)', lineHeight:1.8, maxWidth:520,
          }}>{content.body}</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, flexShrink:0 }}>
            {content.stats.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                transition={{ delay: i * 0.07 }}
                style={{ textAlign:'center', padding:'12px 20px', border:`1px solid ${lc}`,
                  background:'rgba(180,210,255,0.03)' }}
              >
                <div style={{
                  fontFamily:"'Orbitron',sans-serif", fontSize:'1.4rem',
                  fontWeight:700, color:'rgba(180,210,255,0.92)',
                  marginBottom:4,
                }}>{s.value}</div>
                <div style={{
                  fontFamily:"'Rajdhani',sans-serif", fontSize:'0.62rem',
                  letterSpacing:'0.12em', textTransform:'uppercase',
                  color:'rgba(180,210,255,0.45)',
                }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ─ CONTACT ─ */}
      {activeNav === 'Contact' && (
        <div style={{ display:'flex', gap:40, alignItems:'flex-start' }}>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, maxWidth:400 }}>
            {content.fields.map((placeholder, i) => {
              const isMsg = i === 1;
              const Tag = isMsg ? 'textarea' : 'input';
              return (
                <Tag key={i} placeholder={placeholder} rows={isMsg ? 3 : undefined} style={{
                  width:'100%', padding:'10px 14px',
                  background:'rgba(180,210,255,0.04)',
                  border:`1px solid ${lc}`,
                  color:'rgba(180,210,255,0.85)',
                  fontFamily:"'Rajdhani',sans-serif", fontSize:'0.80rem',
                  letterSpacing:'0.05em', outline:'none', resize:'none',
                  '::placeholder': { color:'rgba(180,210,255,0.30)' },
                }} />
              );
            })}
            <Button variant="default" size="sm" style={{ alignSelf:'flex-start' }}>
              Send Message
            </Button>
          </div>
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
            {content.links.map((l, i) => (
              <motion.a key={i} href={l.href} target="_blank" rel="noreferrer"
                initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 18px', border:`1px solid ${lc}`,
                  background:'rgba(180,210,255,0.03)',
                  color:'rgba(180,210,255,0.65)',
                  fontFamily:"'Orbitron',sans-serif", fontSize:'0.58rem',
                  letterSpacing:'0.16em', textTransform:'uppercase',
                  textDecoration:'none', transition:'all 0.2s',
                }}
                whileHover={{ background:'rgba(180,210,255,0.09)', color:'rgba(180,210,255,1)' }}
              >{l.label} →</motion.a>
            ))}
          </div>
        </div>
      )}

      {/* Bottom scan line */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:1,
        background:'linear-gradient(to right,transparent,rgba(180,210,255,0.25),transparent)',
      }} />
    </motion.div>
  );
}
