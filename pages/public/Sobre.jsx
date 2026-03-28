import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, Phone, MessageCircle } from 'lucide-react';
import { corretores } from '../../data/corretores.js';
import { wppLink, formatCurrency } from '../../utils/helpers.js';

const VALORES = [
  { title: 'Transparência',     desc: 'Comunicação clara e honesta em todas as etapas da negociação.' },
  { title: 'Excelência',        desc: 'Atendimento diferenciado e imóveis selecionados com rigor.' },
  { title: 'Compromisso',       desc: 'Dedicação total para encontrar o imóvel certo para você.' },
  { title: 'Responsabilidade',  desc: 'Segurança jurídica e ética em cada transação imobiliária.' },
];

export default function SobrePage({ navigate }) {
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setVisible((p) => ({ ...p, [e.target.dataset.s]: true }));
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('[data-s]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <main style={{ paddingTop: 'var(--header-h)' }}>
      {/* Hero */}
      <div
        style={{
          background: 'var(--navy)',
          padding: '64px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="container">
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Quem somos</p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 400, maxWidth: 600 }}>
            Referência em imóveis de <em style={{ fontWeight: 600 }}>alto padrão</em> na Grande Vitória
          </h1>
        </div>
      </div>

      {/* About text + image */}
      <section data-s="about" style={{ padding: '96px 0', background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="about-grid">
            <div className={visible.about ? 'animate-rise' : ''}>
              <p className="subheading" style={{ marginBottom: 12 }}>Nossa história</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--navy)', marginBottom: 24 }}>
                15 anos transformando sonhos em realidade
              </h2>
              <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: 20 }}>
                A VilaVix Imóveis nasceu em 2010 com a missão de oferecer um serviço imobiliário de excelência na Grande Vitória. Desde o início, focamos em atender clientes que buscam qualidade, segurança e profissionalismo.
              </p>
              <p style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: 32 }}>
                Hoje somos referência no segmento de alto padrão, com um portfólio exclusivo de apartamentos, casas e coberturas nos melhores bairros de Vitória, Vila Velha e Guarapari. Nossa equipe de corretores especializados acompanha você em cada etapa, do primeiro contato até a entrega das chaves.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['CRECI-ES 7.820-J', 'Membro COFECI', 'Certificação ABMH', 'Parceiro Caixa Econômica Federal'].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.92rem' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={visible.about ? 'animate-rise d2' : ''}>
              <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
                  alt="Escritório VilaVix"
                  style={{ width: '100%', height: 420, objectFit: 'cover' }}
                />
                {/* Floating stat card */}
                <div className="glass-white" style={{ position: 'absolute', bottom: 24, left: 24, padding: '16px 20px', borderRadius: 14 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1 }}>R$ 2.8B+</div>
                  <div style={{ color: 'var(--text3)', fontSize: '0.8rem', marginTop: 4 }}>em transações realizadas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section data-s="valores" style={{ padding: '80px 0', background: 'white' }}>
        <div className="container">
          <div className={`text-center ${visible.valores ? 'animate-rise' : ''}`} style={{ marginBottom: 48 }}>
            <p className="subheading">Nossos princípios</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', color: 'var(--navy)', marginTop: 8 }}>Valores que nos guiam</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {VALORES.map((v, i) => (
              <div
                key={i}
                className={`card ${visible.valores ? `animate-rise d${i + 1}` : ''}`}
                style={{ padding: 28 }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Award size={20} style={{ color: 'var(--red)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.1rem', marginBottom: 8 }}>{v.title}</h3>
                <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section data-s="team" style={{ padding: '96px 0', background: 'var(--bg)' }}>
        <div className="container">
          <div className={`text-center ${visible.team ? 'animate-rise' : ''}`} style={{ marginBottom: 56 }}>
            <p className="subheading">Especialistas</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--navy)', marginTop: 8 }}>
              Nossa equipe de corretores
            </h2>
            <p style={{ color: 'var(--text2)', marginTop: 16, maxWidth: 480, margin: '16px auto 0' }}>
              Profissionais altamente qualificados, com especialização nos melhores bairros da Grande Vitória.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {corretores.map((c, i) => (
              <div
                key={c.id}
                className={`card ${visible.team ? `animate-rise d${i + 1}` : ''}`}
                style={{ padding: 32, textAlign: 'center' }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: `linear-gradient(135deg, var(--navy), var(--navy-mid))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '1.8rem', fontWeight: 700, color: 'white',
                    fontFamily: 'var(--font-display)',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  {c.foto}
                </div>

                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.2rem', marginBottom: 4 }}>{c.nome}</h3>
                <p style={{ color: 'var(--text3)', fontSize: '0.8rem', marginBottom: 4 }}>CRECI {c.creci}</p>
                <span className="badge badge-navy" style={{ marginBottom: 20 }}>{c.esp}</span>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 8px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--navy)' }}>{c.vendas}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>Vendas</div>
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 8px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--navy)' }}>{c.leads}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>Leads</div>
                  </div>
                </div>

                <a
                  href={wppLink(c.telefone, `Olá ${c.nome.split(' ')[0]}! Vim pelo site da VilaVix e gostaria de mais informações.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-wpp btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <MessageCircle size={15} />
                  WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '72px 0', background: 'var(--navy)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 400, marginBottom: 16 }}>
            Pronto para encontrar seu <em style={{ fontWeight: 600 }}>imóvel ideal</em>?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
            Nossa equipe está à disposição para atendê-lo com excelência.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-red btn-lg" onClick={() => navigate('imoveis')}>
              Ver imóveis
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate('contato')}>
              Fale conosco
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .about-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
