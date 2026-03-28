import React from 'react';

/**
 * VilaVix Logo — geometric skew shapes in navy/red/white
 * Props:
 *   light  — white text variant (for dark backgrounds)
 *   big    — larger size
 *   onClick — click handler
 */
export default function Logo({ light = false, big = false, onClick }) {
  const size   = big ? 40 : 28;
  const textSz = big ? '1.4rem' : '1rem';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: big ? 14 : 10,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Geometric mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Base rect — navy */}
        <rect width="40" height="40" rx="8" fill={light ? 'rgba(255,255,255,0.15)' : '#152036'} />

        {/* Shape 1 — navy stripe skewed */}
        <polygon points="4,32 16,8 22,8 10,32" fill={light ? 'rgba(255,255,255,0.9)' : 'white'} />

        {/* Shape 2 — red stripe skewed, overlapping */}
        <polygon points="14,32 26,8 32,8 20,32" fill="#C62828" />

        {/* Shape 3 — white thin accent */}
        <polygon points="24,32 30,20 36,20 30,32" fill={light ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)'} />
      </svg>

      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: textSz,
            color: light ? 'white' : 'var(--navy)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          VilaVix
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            fontSize: big ? '0.65rem' : '0.55rem',
            color: light ? 'rgba(255,255,255,0.6)' : 'var(--text3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: 1,
          }}
        >
          Imóveis
        </span>
      </div>
    </div>
  );
}
