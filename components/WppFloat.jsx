import React, { useState } from 'react';
import { wppLink, WPP_DEFAULT_MSG, WPP_NUMBER } from '../utils/helpers.js';

export default function WppFloat() {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={styles.wrapper}>
      {/* Tooltip */}
      <div
        style={{
          ...styles.tooltip,
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(-8px)' : 'translateX(0)',
        }}
      >
        Fale pelo WhatsApp
        <span style={styles.tooltipArrow} />
      </div>

      {/* Button */}
      <a
        href={wppLink(WPP_NUMBER, WPP_DEFAULT_MSG)}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.btn}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Contato via WhatsApp"
      >
        {/* WhatsApp SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="white"
        >
          <path d="M16 0C7.164 0 0 7.164 0 16c0 2.823.737 5.476 2.027 7.785L0 32l8.442-2.213A15.942 15.942 0 0 0 16 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm8.322 22.555c-.344.969-2.006 1.848-2.76 1.967-.707.113-1.6.16-2.582-.162-.597-.193-1.363-.45-2.343-.883-4.118-1.777-6.81-5.944-7.015-6.217-.206-.273-1.683-2.237-1.683-4.267s1.065-3.027 1.443-3.44c.377-.413.822-.516 1.096-.516.273 0 .548.003.787.013.252.012.59-.095.923.705.344.824 1.167 2.855 1.27 3.063.103.207.172.45.034.724-.137.273-.207.443-.41.682-.207.24-.434.536-.619.72-.207.206-.423.43-.182.843.24.413 1.067 1.76 2.29 2.851 1.573 1.401 2.9 1.834 3.312 2.04.413.207.653.172.893-.103.24-.274 1.03-1.2 1.304-1.613.273-.413.547-.344.924-.206.377.137 2.395 1.13 2.808 1.337.413.206.685.31.788.482.103.172.103.996-.24 1.965z" />
        </svg>
      </a>

      <style>{`
        @keyframes wppPulse {
          0%   { box-shadow: 0 0 0 0   rgba(37,211,102,0.70); }
          70%  { box-shadow: 0 0 0 18px rgba(37,211,102,0);   }
          100% { box-shadow: 0 0 0 0   rgba(37,211,102,0);    }
        }
        .wpp-float-btn {
          animation: wppPulse 2.4s ease-in-out infinite;
        }
        .wpp-float-btn:hover {
          transform: scale(1.08) translateY(-2px) !important;
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'fixed',
    bottom: 32,
    right: 32,
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: '#25D366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 24px rgba(37,211,102,0.45)',
    transition: 'transform 0.3s cubic-bezier(.22,1,.36,1)',
    animation: 'wppPulse 2.4s ease-in-out infinite',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  tooltip: {
    background: '#152036',
    color: 'white',
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: '0.83rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    position: 'relative',
    transition: 'all 0.25s cubic-bezier(.22,1,.36,1)',
    pointerEvents: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  tooltipArrow: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -4,
    width: 0,
    height: 0,
    borderTop: '5px solid transparent',
    borderBottom: '5px solid transparent',
    borderLeft: '6px solid #152036',
  },
};
