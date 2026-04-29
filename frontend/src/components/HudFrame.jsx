/**
 * HudFrame — Sci-fi edge decorations for the hero page.
 * Renders corner brackets, side columns with sweeping arcs,
 * dot grids, radar orbs, tick marks, and a top centre visor panel.
 * All elements are SVG / CSS – zero canvas overhead.
 */
import React from 'react';
import { motion } from 'framer-motion';

const LC = 'rgba(180,210,255,0.22)';
const LC_DIM = 'rgba(180,210,255,0.10)';
const LC_BRIGHT = 'rgba(180,210,255,0.45)';

/* ─── Animated scan-line that travels vertically ─── */
function ScanLine({ side }) {
  const isL = side === 'left';
  return (
    <motion.div
      animate={{ top: ['5%', '90%', '5%'] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        [isL ? 'left' : 'right']: 6,
        width: 44,
        height: 1,
        background: `linear-gradient(${isL ? 'to right' : 'to left'},rgba(0,243,255,0.5),transparent)`,
        filter: 'blur(0.5px)',
        pointerEvents: 'none',
      }}
    />
  );
}

/* ─── 3×3 dot grid ─── */
function DotGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,7px)', gridTemplateRows: 'repeat(3,7px)', gap: 4 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{
          width: 2, height: 2, borderRadius: '50%',
          background: `rgba(180,210,255,${0.13 + (i % 3) * 0.07})`,
          alignSelf: 'center', justifySelf: 'center',
        }} />
      ))}
    </div>
  );
}

/* ─── L-shaped corner bracket ─── */
function Corner({ pos }) {
  const sz = 28;
  const b = `1px solid ${LC}`;
  const isT = pos[0] === 't';
  const isL = pos[1] === 'l';

  /* Animated corner dot */
  const dotStyle = {
    position: 'absolute',
    width: 3, height: 3, borderRadius: '50%',
    background: 'rgba(0,243,255,0.7)',
    boxShadow: '0 0 6px rgba(0,243,255,0.5)',
    [isT ? 'top' : 'bottom']: -1,
    [isL ? 'left' : 'right']: -1,
  };

  return (
    <div style={{
      position: 'absolute',
      top: isT ? 8 : undefined, bottom: !isT ? 8 : undefined,
      left: isL ? 8 : undefined, right: !isL ? 8 : undefined,
      width: sz, height: sz,
      borderTop: isT ? b : 'none',
      borderBottom: !isT ? b : 'none',
      borderLeft: isL ? b : 'none',
      borderRight: !isL ? b : 'none',
    }}>
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={dotStyle}
      />
    </div>
  );
}

/* ─── Full-height side column ─── */
function SideColumn({ side }) {
  const isL = side === 'left';
  const W = 64, H = 730;
  const cx = W / 2;
  const bx = isL ? W - 4 : 4;

  const arcMain = isL
    ? `M ${cx},18 C ${W - 4},110 ${W - 2},260 ${W - 2},${H / 2} C ${W - 2},${H - 260} ${W - 4},${H - 110} ${cx},${H - 18}`
    : `M ${cx},18 C 4,110 2,260 2,${H / 2} C 2,${H - 260} 4,${H - 110} ${cx},${H - 18}`;

  const arcInner = isL
    ? `M ${cx},120 C ${W - 10},200 ${W - 8},290 ${W - 8},${H / 2} C ${W - 8},${H - 290} ${W - 10},${H - 200} ${cx},${H - 120}`
    : `M ${cx},120 C 10,200 8,290 8,${H / 2} C 8,${H - 290} 10,${H - 200} ${cx},${H - 120}`;

  const crossYs = [H * 0.22, H * 0.50, H * 0.78];
  const bk = isL ? { x1: W - 12, x2: W - 4 } : { x1: 12, x2: 4 };

  /* Tick mark positions along the outer edge */
  const ticks = Array.from({ length: 18 }, (_, i) => (H / 19) * (i + 1));

  return (
    <div style={{
      position: 'absolute', [isL ? 'left' : 'right']: 0,
      top: 0, bottom: 0, width: W, pointerEvents: 'none',
    }}>
      <ScanLine side={side} />

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">

        {/* Outer border */}
        <line x1={bx} y1="0" x2={bx} y2={H} stroke="rgba(180,210,255,0.18)" strokeWidth="0.6" />

        {/* Inner dashed line */}
        <line x1={cx} y1="30" x2={cx} y2={H - 30}
          stroke="rgba(180,210,255,0.06)" strokeWidth="0.4" strokeDasharray="3 6" />

        {/* Main sweeping arc */}
        <path d={arcMain} stroke="rgba(180,210,255,0.26)" strokeWidth="0.9" fill="none" />

        {/* Secondary inner arc */}
        <path d={arcInner} stroke="rgba(180,210,255,0.14)" strokeWidth="0.65" fill="none" />

        {/* Cross-hair markers */}
        {crossYs.map((y, i) => (
          <g key={i}>
            <line x1={cx - 7} y1={y} x2={cx + 7} y2={y} stroke="rgba(180,210,255,0.38)" strokeWidth="0.8" />
            <line x1={cx} y1={y - 7} x2={cx} y2={y + 7} stroke="rgba(180,210,255,0.38)" strokeWidth="0.8" />
            <line x1={cx - 7} y1={y - 4} x2={cx - 7} y2={y + 4} stroke="rgba(180,210,255,0.22)" strokeWidth="0.5" />
            <line x1={cx + 7} y1={y - 4} x2={cx + 7} y2={y + 4} stroke="rgba(180,210,255,0.22)" strokeWidth="0.5" />
          </g>
        ))}

        {/* Bracket pairs */}
        <path d={`M ${bk.x1},${H * 0.44} L ${bk.x2},${H * 0.44} L ${bk.x2},${H * 0.40} L ${bk.x1},${H * 0.40}`}
          stroke="rgba(180,210,255,0.32)" strokeWidth="0.7" fill="none" />
        <path d={`M ${bk.x1},${H * 0.56} L ${bk.x2},${H * 0.56} L ${bk.x2},${H * 0.60} L ${bk.x1},${H * 0.60}`}
          stroke="rgba(180,210,255,0.32)" strokeWidth="0.7" fill="none" />

        {/* Diagonal tick marks */}
        {[[H * 0.07, 1], [H * 0.93, -1]].map(([y, dir], i) => (
          <line key={i}
            x1={isL ? cx + 4 : cx - 4} y1={y}
            x2={isL ? cx + 14 : cx - 14} y2={y + dir * 10}
            stroke="rgba(180,210,255,0.30)" strokeWidth="0.8" />
        ))}

        {/* Small grid-square markers */}
        {[[H * 0.14], [H * 0.86]].map(([y], i) => (
          <rect key={i} x={cx - 5} y={y - 5} width={10} height={10}
            stroke="rgba(180,210,255,0.18)" strokeWidth="0.5" fill="none" />
        ))}

        {/* Horizontal scan lines */}
        <line x1={isL ? cx : 4} y1={H * 0.32} x2={bx} y2={H * 0.32} stroke={LC_DIM} strokeWidth="0.5" />
        <line x1={isL ? cx : 4} y1={H * 0.68} x2={bx} y2={H * 0.68} stroke={LC_DIM} strokeWidth="0.5" />

        {/* Edge tick marks */}
        {ticks.map((y, i) => (
          <line key={`t${i}`}
            x1={bx} y1={y}
            x2={bx + (isL ? -4 : 4)} y2={y}
            stroke="rgba(180,210,255,0.14)" strokeWidth="0.5" />
        ))}
      </svg>

      {/* Dot grids */}
      <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)' }}>
        <DotGrid />
      </div>
      <div style={{ position: 'absolute', top: '80%', left: '50%', transform: 'translateX(-50%)' }}>
        <DotGrid />
      </div>

      {/* Central radar orb */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: isL ? 16 : 5, height: 1, background: LC }} />
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: LC }} />
          <div style={{ width: isL ? 5 : 16, height: 1, background: LC }} />
        </div>
        <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[44, 33, 22, 12].map((d, i) => (
            <motion.div key={i}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 20 + i * 5, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', width: d, height: d, borderRadius: '50%',
                border: `1px solid rgba(180,210,255,${0.05 + i * 0.08})`,
              }}
            />
          ))}
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'rgba(220,235,255,0.95)',
              boxShadow: '0 0 12px 5px rgba(140,200,255,0.65)',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: isL ? 16 : 5, height: 1, background: LC }} />
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: LC }} />
          <div style={{ width: isL ? 5 : 16, height: 1, background: LC }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Top HUD visor panel ─── */
function TopHud() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: 72, display: 'flex', alignItems: 'flex-start',
    }}>
      {/* Left trace */}
      <div style={{ flex: 1, paddingLeft: 55, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '38%', height: 1, background: LC }} />
          <div style={{ width: 1, height: 14, background: LC }} />
          <div style={{ flex: 1, height: 1, background: LC_DIM }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '10%' }}>
          <div style={{ width: '22%', height: 1, background: LC_DIM }} />
          <div style={{ width: 1, height: 8, background: LC_DIM }} />
          <div style={{ width: '18%', height: 1, background: LC_DIM }} />
        </div>
      </div>

      {/* Centre stepped panel */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
          <div style={{ width: 26, height: 7, border: `1px solid ${LC}`, borderBottom: 'none', background: 'rgba(180,210,255,0.06)' }} />
          <div style={{ width: 78, height: 12, border: `1px solid ${LC}`, borderBottom: 'none', background: 'rgba(180,210,255,0.05)' }} />
          <div style={{ width: 26, height: 7, border: `1px solid ${LC}`, borderBottom: 'none', background: 'rgba(180,210,255,0.06)' }} />
        </div>
        <div style={{
          width: 200, height: 20, border: `1px solid ${LC}`,
          background: 'rgba(180,210,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ width: 18, height: 2, background: LC_BRIGHT }} />
          <div style={{ width: 40, height: 2, background: 'rgba(180,210,255,0.60)' }} />
          <div style={{ width: 18, height: 2, background: LC_BRIGHT }} />
          {/* Animated scan across the visor */}
          <motion.div
            animate={{ left: ['-30%', '130%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '30%',
              background: 'linear-gradient(to right,transparent,rgba(0,243,255,0.08),transparent)',
            }}
          />
        </div>
        <div style={{
          width: 120, height: 7,
          borderLeft: '1px solid rgba(180,210,255,0.18)',
          borderRight: '1px solid rgba(180,210,255,0.18)',
          borderBottom: '1px solid rgba(180,210,255,0.18)',
          background: 'rgba(180,210,255,0.03)',
        }} />
      </div>

      {/* Right trace (mirrored) */}
      <div style={{ flex: 1, paddingRight: 55, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
          <div style={{ flex: 1, height: 1, background: LC_DIM }} />
          <div style={{ width: 1, height: 14, background: LC }} />
          <div style={{ width: '38%', height: 1, background: LC }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '10%' }}>
          <div style={{ width: '18%', height: 1, background: LC_DIM }} />
          <div style={{ width: 1, height: 8, background: LC_DIM }} />
          <div style={{ width: '22%', height: 1, background: LC_DIM }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Bottom centre bar ─── */
function BottomBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 8, left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ width: 60, height: 1, background: LC }} />
      <div style={{ width: 32, height: 7, borderLeft: `1px solid ${LC}`, borderRight: `1px solid ${LC}` }} />
      <div style={{ width: 60, height: 1, background: LC }} />
    </div>
  );
}

/* ─── Diagonal corner accents ─── */
function DiagonalAccent({ corner }) {
  const isTop = corner[0] === 't';
  const isLeft = corner[1] === 'l';
  const len = 80;

  return (
    <svg
      style={{
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 0,
        [isLeft ? 'left' : 'right']: 0,
        width: len, height: len,
        pointerEvents: 'none',
      }}
      viewBox={`0 0 ${len} ${len}`}
    >
      <line
        x1={isLeft ? 0 : len} y1={isTop ? 0 : len}
        x2={isLeft ? len : 0} y2={isTop ? len : 0}
        stroke="rgba(180,210,255,0.07)" strokeWidth="0.8"
      />
      <line
        x1={isLeft ? 0 : len} y1={isTop ? 0 : len}
        x2={isLeft ? len * 0.6 : len * 0.4} y2={isTop ? len * 0.6 : len * 0.4}
        stroke="rgba(180,210,255,0.12)" strokeWidth="0.6"
      />
    </svg>
  );
}

/* ═══ Main HUD Frame Export ═══ */
export default function HudFrame() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.8, delay: 0.2 }}
      style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }}
    >
      {/* Thin outer border with subtle glow */}
      <div style={{
        position: 'absolute', inset: 8,
        border: '1px solid rgba(180,210,255,0.08)',
        boxShadow: 'inset 0 0 60px rgba(0,243,255,0.02)',
      }} />

      {/* Top HUD visor */}
      <TopHud />

      {/* Bottom centre bar */}
      <BottomBar />

      {/* Corner brackets */}
      {['tl', 'tr', 'bl', 'br'].map(p => <Corner key={p} pos={p} />)}

      {/* Diagonal accents */}
      {['tl', 'tr', 'bl', 'br'].map(p => <DiagonalAccent key={`d-${p}`} corner={p} />)}

      {/* Side columns */}
      <SideColumn side="left" />
      <SideColumn side="right" />
    </motion.div>
  );
}
