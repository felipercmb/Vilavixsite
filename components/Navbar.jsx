import React, { useState, useEffect } from 'react';
import Logo from './Logo.jsx';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Início',    page: 'home'    },
  { label: 'Imóveis',  page: 'imoveis' },
  { label: 'Blog',     page: 'blog'    },
  { label: 'Sobre',    page: 'sobre'   },
  { label: 'Contato',  page: 'contato' },
];

export default function Navbar({ page, navigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHero = page === 'home';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const transparent = isHero && !scrolled && !mobileOpen;

  const go = (p) => {
    navigate(p);
    setMobileOpen(false);
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 'var(--header-h)',
          transition: 'background 0.4s ease, box-shadow 0.4s ease, backdrop-filter 0.4s ease',
          background: transparent
            ? 'rgba(0,0,0,0)'
            : 'rgba(255,255,255,0.88)',
          backdropFilter: transparent ? 'none' : 'blur(24px)',
          WebkitBackdropFilter: transparent ? 'none' : 'blur(24px)',
          boxShadow: transparent ? 'none' : '0 1px 32px rgba(21,32,54,0.10)',
          borderBottom: transparent ? 'none' : '1px solid rgba(21,32,54,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 32px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Logo light={transparent} onClick={() => go('home')} />

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-links">
            {NAV_LINKS.map((l) => (
              <button
                key={l.page}
                onClick={() => go(l.page)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  color: transparent
                    ? page === l.page ? 'white' : 'rgba(255,255,255,0.8)'
                    : page === l.page ? 'var(--navy)' : 'var(--text2)',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = transparent ? 'white' : 'var(--navy)';
                  e.currentTarget.style.background = transparent
                    ? 'rgba(255,255,255,0.12)'
                    : 'var(--navy-light)';
                }}
                onMouseLeave={(e) => {
                  const isActive = page === l.page;
                  e.currentTarget.style.color = transparent
                    ? isActive ? 'white' : 'rgba(255,255,255,0.8)'
                    : isActive ? 'var(--navy)' : 'var(--text2)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                {l.label}
                {page === l.page && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: transparent ? 'white' : 'var(--red)',
                    }}
                  />
                )}
              </button>
            ))}

            <button
              onClick={() => go('login')}
              style={{
                marginLeft: 8,
                padding: '9px 20px',
                borderRadius: 10,
                border: `1.5px solid ${transparent ? 'rgba(255,255,255,0.5)' : 'var(--navy)'}`,
                background: transparent ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: transparent ? 'white' : 'var(--navy)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.25)' : 'var(--navy)';
                e.currentTarget.style.color = transparent ? 'white' : 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.10)' : 'transparent';
                e.currentTarget.style.color = transparent ? 'white' : 'var(--navy)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Área do Corretor
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: transparent ? 'white' : 'var(--navy)',
              padding: 8,
              borderRadius: 8,
            }}
            className="mobile-menu-btn"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(24px)',
              borderTop: '1px solid var(--line)',
              padding: '16px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {NAV_LINKS.map((l) => (
              <button
                key={l.page}
                onClick={() => go(l.page)}
                style={{
                  background: page === l.page ? 'var(--navy-light)' : 'none',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontSize: '0.95rem',
                  fontWeight: page === l.page ? 600 : 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--navy)',
                  textAlign: 'left',
                }}
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => go('login')}
              className="btn btn-primary"
              style={{ marginTop: 8, width: '100%' }}
            >
              Área do Corretor
            </button>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
