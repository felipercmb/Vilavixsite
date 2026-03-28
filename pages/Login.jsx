import React, { useState } from 'react';
import Logo from '../components/Logo.jsx';
import { Eye, EyeOff, ArrowLeft, Lock, Mail } from 'lucide-react';
import { authSignIn } from '../lib/db.js';

export default function LoginPage({ onLogin, navigate }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Preencha email e senha.'); return; }
    setLoading(true);
    const { data, error: err } = await authSignIn(email, password);
    setLoading(false);
    if (err) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      return;
    }
    onLogin(data.user);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }} className="login-layout">
      {/* Left — image panel */}
      <div
        style={{
          position: 'relative',
          backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 48,
          overflow: 'hidden',
        }}
      >
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(12,21,38,0.85) 0%, rgba(12,21,38,0.6) 100%)' }} />

        {/* Decorative orb */}
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Top: Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Logo light big />
        </div>

        {/* Bottom: Text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              color: 'white',
              fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
              fontWeight: 300,
              lineHeight: 1.15,
              marginBottom: 16,
              letterSpacing: '-0.01em',
            }}
          >
            Área exclusiva<br />
            <em style={{ fontWeight: 600 }}>dos corretores</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 360, fontSize: '0.95rem' }}>
            Acesse o CRM VilaVix para gerenciar seus leads, imóveis e visitas com praticidade e eficiência.
          </p>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            {[
              { val: '500+', label: 'Imóveis' },
              { val: '1.2k+', label: 'Clientes' },
              { val: '33', label: 'Vendas/mês' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.6rem', fontWeight: 600 }}>{s.val}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 64px',
          background: 'var(--bg)',
        }}
        className="login-form-panel"
      >
        {/* Back to site */}
        <button
          onClick={() => navigate('home')}
          style={{
            position: 'absolute', top: 32, right: 40,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
            padding: '8px 12px', borderRadius: 8,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--navy)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)'; }}
        >
          <ArrowLeft size={16} />
          Voltar ao site
        </button>

        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'var(--red-light)', marginBottom: 20 }}>
              <Lock size={13} style={{ color: 'var(--red)' }} />
              <span style={{ color: 'var(--red)', fontSize: '0.75rem', fontWeight: 600 }}>Acesso restrito</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '2rem', fontWeight: 600, marginBottom: 8 }}>
              Entrar no CRM
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '0.92rem' }}>
              Use suas credenciais de corretor para acessar.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{ padding: '12px 16px', background: 'var(--red-light)', borderRadius: 10, color: 'var(--red)', fontSize: '0.88rem', border: '1px solid rgba(198,40,40,0.2)' }}>
                {error}
              </div>
            )}

            <div>
              <label className="label">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  className="input"
                  type="email"
                  placeholder="corretor@vilavix.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Senha</label>
                <a href="#" style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 500 }}>Esqueci a senha</a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                'Entrar no sistema'
              )}
            </button>
          </form>

          <p style={{ marginTop: 32, color: 'var(--text3)', fontSize: '0.8rem', textAlign: 'center' }}>
            Problemas para acessar?{' '}
            <a href="#" style={{ color: 'var(--navy)', fontWeight: 600 }}>Contate o suporte</a>
          </p>

          <div style={{ marginTop: 24, padding: '14px 18px', background: 'white', border: '1px solid var(--line2)', borderRadius: 12, fontSize: '0.8rem', color: 'var(--text2)' }}>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Acesso:</span> Use as credenciais cadastradas pelo administrador do sistema.
          </div>
        </div>
      </div>

      <style>{`
        .login-layout { position: relative; }
        @media (max-width: 768px) {
          .login-layout { grid-template-columns: 1fr !important; }
          .login-layout > div:first-child { display: none !important; }
          .login-form-panel { padding: 48px 24px !important; }
        }
      `}</style>
    </div>
  );
}
