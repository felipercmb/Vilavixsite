import React from 'react';
import Logo from './Logo.jsx';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Linkedin } from 'lucide-react';

const NAV = [
  { label: 'Início',    page: 'home'    },
  { label: 'Imóveis',  page: 'imoveis' },
  { label: 'Sobre',    page: 'sobre'   },
  { label: 'Contato',  page: 'contato' },
];

export default function Footer({ navigate }) {
  return (
    <footer style={{ background: 'var(--navy)', color: 'white', paddingTop: 72, paddingBottom: 32 }}>
      <div className="container">
        {/* 4 columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr',
            gap: 48,
            paddingBottom: 48,
            borderBottom: '1px solid rgba(255,255,255,0.10)',
          }}
          className="footer-grid"
        >
          {/* Col 1: Logo + description */}
          <div>
            <Logo light big={false} onClick={() => navigate('home')} />
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.7, marginTop: 20, maxWidth: 280 }}>
              Imobiliária premium da Grande Vitória. Conectamos famílias e investidores aos melhores imóveis do Espírito Santo com excelência e credibilidade.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              {[Instagram, Facebook, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.7)',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Links */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
              Navegação
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {NAV.map((l) => (
                <li key={l.page}>
                  <button
                    onClick={() => navigate(l.page)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      padding: 0,
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => navigate('login')}
                  style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.65)', fontSize: '0.92rem',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0,
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                >
                  Área do Corretor
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
              Contato
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { Icon: MapPin, text: 'Av. Vitória, 1200 — Praia do Canto, Vitória - ES' },
                { Icon: Phone, text: '(27) 3344-9900' },
                { Icon: Mail,  text: 'contato@vilavix.com.br' },
              ].map(({ Icon, text }, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon size={15} style={{ color: 'var(--red)', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', lineHeight: 1.5 }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Hours */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
              Horário
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Seg – Sex', '08h às 18h'],
                ['Sábado',    '09h às 13h'],
                ['Domingo',   'Fechado'],
              ].map(([day, time], i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.87rem' }}>{day}</span>
                  <span style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.87rem', fontWeight: 500 }}>{time}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24 }}>
              <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#4ADE80', fontSize: '0.78rem' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', marginRight: 6, animation: 'glow 2s ease-in-out infinite' }} />
                Aberto agora
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>
            © 2026 VilaVix Imóveis. Todos os direitos reservados. CRECI-ES 7.820-J
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacidade', 'Termos de Uso', 'LGPD'].map((l) => (
              <a
                key={l}
                href="#"
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </footer>
  );
}
