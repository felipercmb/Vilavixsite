import React, { useState, useEffect } from 'react';
import {
  Search, ArrowRight, Shield, Star, Award, Users, Phone, MessageCircle,
  TrendingUp, MapPin, Clock, ChevronRight, CheckCircle, Home as HomeIcon,
  Key, FileText, Handshake,
} from 'lucide-react';
import ImovelCard from '../../components/ImovelCard.jsx';
import { imoveis } from '../../data/imoveis.js';
import { posts, formatDataBlog } from '../../data/blog.js';
import { wppLink, WPP_NUMBER, WPP_DEFAULT_MSG } from '../../utils/helpers.js';

/* ── Static data ──────────────────────────────────────────────────────────── */
const STATS = [
  { val: '500+',  label: 'Imóveis Ativos'     },
  { val: '1.2k+', label: 'Clientes Satisfeitos' },
  { val: '15',    label: 'Anos de Mercado'    },
  { val: '98%',   label: 'Taxa de Satisfação' },
];

const BAIRROS = [
  { nome: 'Praia do Canto',   imoveis: 48, img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', cidade: 'Vitória' },
  { nome: 'Jardim da Penha',  imoveis: 34, img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', cidade: 'Vitória' },
  { nome: 'Enseada do Suá',   imoveis: 27, img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80', cidade: 'Vitória' },
  { nome: 'Mata da Praia',    imoveis: 19, img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80', cidade: 'Vitória' },
  { nome: 'Itaparica',        imoveis: 31, img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80', cidade: 'Vila Velha' },
  { nome: 'Meia Praia',       imoveis: 22, img: 'https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=600&q=80', cidade: 'Guarapari' },
];

const COMO_FUNCIONA = [
  { num: '01', Icon: Search,    titulo: 'Busque seu Imóvel',   desc: 'Explore nosso portfólio completo com filtros por tipo, bairro, preço e características. Encontre o imóvel ideal para você.' },
  { num: '02', Icon: Handshake, titulo: 'Fale com um Corretor', desc: 'Nossa equipe especializada entra em contato, entende seu perfil e apresenta as melhores opções do mercado para você.' },
  { num: '03', Icon: Key,       titulo: 'Feche o Negócio',      desc: 'Cuidamos de toda a documentação, financiamento e processo jurídico. Você só precisa pegar as chaves.' },
];

const DIFERENCIAIS = [
  { Icon: Shield,    titulo: 'Segurança Jurídica',    desc: 'Documentação verificada pela nossa equipe. Negociação 100% segura do início ao fim.', color: '#3B82F6' },
  { Icon: TrendingUp, titulo: 'Melhor Investimento',  desc: 'Análise de valorização e rentabilidade. Orientamos ao imóvel com maior potencial de retorno.', color: '#C62828' },
  { Icon: Award,     titulo: 'Portfolio Exclusivo',   desc: 'Os melhores imóveis da Grande Vitória, selecionados com critério de excelência e qualidade.', color: '#8B5CF6' },
  { Icon: Users,     titulo: 'Atendimento Premium',   desc: 'Corretores dedicados ao seu perfil. Suporte completo da busca até as chaves na mão.', color: '#10B981' },
];

const DEPOIMENTOS = [
  { nome: 'Fernanda Costa',       cargo: 'Empresária',      stars: 5, texto: 'Encontrei meu apartamento dos sonhos em Praia do Canto com a VilaVix. Processo rápido, transparente e os corretores são extremamente profissionais.' },
  { nome: 'Dr. Marcos Alencar',   cargo: 'Médico',          stars: 5, texto: 'Investimento certeiro. A equipe me apresentou oportunidades que eu jamais encontraria sozinho. Já são três imóveis com a VilaVix.' },
  { nome: 'Juliana & Paulo Ramos', cargo: 'Primeira casa',  stars: 5, texto: 'Compramos nossa primeira casa com toda a segurança e atenção que precisávamos. Recomendo de olhos fechados.' },
];

const CAT_COLORS = {
  Financiamento: { bg: 'rgba(59,130,246,0.12)',   color: '#1D4ED8' },
  Mercado:       { bg: 'rgba(245,158,11,0.12)',   color: '#B45309' },
  Jurídico:      { bg: 'rgba(139,92,246,0.12)',   color: '#6D28D9' },
  Investimento:  { bg: 'rgba(16,185,129,0.12)',   color: '#065F46' },
  Lifestyle:     { bg: 'rgba(236,72,153,0.12)',   color: '#BE185D' },
};

/* ── Component ────────────────────────────────────────────────────────────── */
export default function HomePage({ navigate }) {
  const [transacao, setTransacao] = useState('comprar');
  const [busca, setBusca]         = useState('');
  const [visible, setVisible]     = useState({});

  const destaques  = imoveis.filter(i => i.destaque && i.status === 'ativo').slice(0, 4);
  const blogPosts  = posts.slice(0, 3);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setVisible(p => ({ ...p, [e.target.dataset.s]: true }));
      }),
      { threshold: 0.10 }
    );
    document.querySelectorAll('[data-s]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <main>

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 720, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* BG image */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center 40%' }} />
        {/* Overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(12,21,38,0.92) 0%, rgba(12,21,38,0.65) 55%, rgba(12,21,38,0.30) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Orbs */}
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.18) 0%, transparent 65%)', animation: 'float 7s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '2%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)', animation: 'float 9s ease-in-out infinite 3s', pointerEvents: 'none' }} />

        {/* Content */}
        <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: 80, paddingBottom: 120 }}>
          <div style={{ maxWidth: 680 }}>
            {/* Pill badge */}
            <div className="animate-fadeIn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', marginBottom: 32 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', animation: 'glow 2s ease-in-out infinite' }} />
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.04em' }}>Grande Vitória · Espírito Santo</span>
            </div>

            {/* Headline */}
            <h1 className="animate-rise d1" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.2rem, 6vw, 6rem)', fontWeight: 300, color: 'white', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Realize o Sonho<br />
              <em style={{ fontWeight: 700, fontStyle: 'italic', color: 'white' }}>do Imóvel Perfeito</em>
            </h1>

            {/* Red accent line */}
            <div className="animate-rise d2" style={{ width: 64, height: 3, background: 'var(--red)', borderRadius: 2, marginBottom: 28 }} />

            <p className="animate-rise d2" style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.1rem', lineHeight: 1.75, maxWidth: 500, marginBottom: 48 }}>
              Apartamentos, casas e coberturas de alto padrão em Vitória, Vila Velha e Guarapari.<br />
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Experiência e credibilidade há 15 anos.</span>
            </p>

            {/* Search card */}
            <div className="animate-rise d3 glass-white" style={{ padding: '20px 24px', borderRadius: 20, maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              {/* Toggle */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                {['comprar','alugar'].map(op => (
                  <button key={op} onClick={() => setTransacao(op)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.25s', background: transacao === op ? 'white' : 'transparent', color: transacao === op ? 'var(--navy)' : 'var(--text3)', boxShadow: transacao === op ? 'var(--shadow-xs)' : 'none' }}>
                    {op === 'comprar' ? 'Comprar' : 'Alugar'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input className="input" placeholder="Bairro, cidade ou referência..." value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key === 'Enter' && navigate('imoveis')} style={{ paddingLeft: 40 }} />
                </div>
                <button className="btn btn-red" onClick={() => navigate('imoveis')} style={{ flexShrink: 0 }}>
                  <Search size={16} /> Buscar
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Floating property teaser — bottom right of section */}
        <div className="animate-rise d4 hero-float-card" style={{ position: 'absolute', bottom: 80, right: '5%', width: 260, zIndex: 3 }}>
          <div className="glass" style={{ padding: '16px 20px', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', animation: 'glow 2s ease-in-out infinite' }} />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Novo destaque</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: 4, lineHeight: 1.3 }}>Cobertura Duplex Vista Mar</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Praia do Canto · Vitória</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'white', fontWeight: 600 }}>R$ 2.850.000</div>
            <button onClick={() => navigate('imoveis')} style={{ marginTop: 12, width: '100%', padding: '8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.10)', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Ver imóvel →
            </button>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', animation: 'float 2.5s ease-in-out infinite', pointerEvents: 'none' }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Explorar</span>
          <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════════ */}
      <section data-s="stats" style={{ background: 'var(--navy-deep)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map((s, i) => (
            <div key={i} className={visible.stats ? `animate-rise d${i+1}` : ''} style={{ padding: '36px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 600, color: 'white', lineHeight: 1 }}>{s.val}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 8, fontWeight: 500, letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURED PROPERTIES
      ══════════════════════════════════════════════════════════ */}
      <section data-s="destaques" style={{ padding: '100px 0', background: 'white' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 56 }}>
            <div className={visible.destaques ? 'animate-rise' : ''}>
              <p className="subheading">Seleção Exclusiva</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', marginTop: 8 }}>Imóveis em Destaque</h2>
              <p style={{ color: 'var(--text3)', marginTop: 10, fontSize: '0.95rem' }}>Os melhores imóveis selecionados pela nossa equipe esta semana</p>
            </div>
            <button className={`btn btn-outline ${visible.destaques ? 'animate-rise d2' : ''}`} onClick={() => navigate('imoveis')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Ver todos <ArrowRight size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 28 }}>
            {destaques.map((im, i) => (
              <div key={im.id} className={visible.destaques ? `animate-rise d${i+1}` : ''}>
                <ImovelCard imovel={im} view="grid" navigate={navigate} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BAIRROS
      ══════════════════════════════════════════════════════════ */}
      <section data-s="bairros" style={{ padding: '100px 0', background: 'var(--bg)' }}>
        <div className="container">
          <div className={`${visible.bairros ? 'animate-rise' : ''}`} style={{ textAlign: 'center', marginBottom: 56 }}>
            <p className="subheading">Explore por Região</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', marginTop: 8 }}>Os Melhores Bairros da Grande Vitória</h2>
            <p style={{ color: 'var(--text3)', marginTop: 14, maxWidth: 500, margin: '14px auto 0', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Cada bairro tem sua personalidade. Encontre aquele que combina com o seu estilo de vida.
            </p>
          </div>

          {/* Grid: 2 large + 4 small */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'auto auto', gap: 16 }} className="bairros-grid">
            {BAIRROS.map((b, i) => (
              <div
                key={b.nome}
                className={visible.bairros ? `animate-rise d${Math.min(i+1,6)}` : ''}
                onClick={() => navigate('imoveis')}
                style={{
                  position: 'relative',
                  height: i < 2 ? 320 : 200,
                  borderRadius: 20,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  gridColumn: i < 2 ? 'span 1' : 'span 1',
                }}
                onMouseEnter={e => { e.currentTarget.querySelector('img').style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.querySelector('img').style.transform = 'scale(1)'; }}
              >
                <img src={b.img} alt={b.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s var(--ease)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,21,38,0.82) 0%, rgba(12,21,38,0.2) 60%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{b.cidade}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: i < 2 ? '1.4rem' : '1.1rem', fontWeight: 600, color: 'white', marginBottom: 6 }}>{b.nome}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                    {b.imoveis} imóveis disponíveis
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          COMO FUNCIONA
      ══════════════════════════════════════════════════════════ */}
      <section data-s="como" style={{ padding: '100px 0', background: 'var(--navy)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className={`text-center ${visible.como ? 'animate-rise' : ''}`} style={{ marginBottom: 64 }}>
            <p className="subheading" style={{ color: '#EF9A9A' }}>Simples e Transparente</p>
            <h2 style={{ color: 'white', fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', marginTop: 8 }}>Como Funciona</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, alignItems: 'start', position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', top: 36, left: '16.6%', right: '16.6%', height: 1, background: 'linear-gradient(to right, rgba(255,255,255,0.15) 0%, rgba(198,40,40,0.4) 50%, rgba(255,255,255,0.15) 100%)', zIndex: 0 }} />

            {COMO_FUNCIONA.map((step, i) => {
              const Icon = step.Icon;
              return (
                <div key={i} className={visible.como ? `animate-rise d${i+1}` : ''} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  {/* Number circle */}
                  <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 28px' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: i === 0 ? 'var(--red)' : 'rgba(255,255,255,0.08)', border: `2px solid ${i === 0 ? 'var(--red)' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                      <Icon size={28} color={i === 0 ? 'white' : 'rgba(255,255,255,0.7)'} />
                    </div>
                    <div style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: 'var(--navy-deep)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                      {step.num}
                    </div>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.2rem', marginBottom: 12 }}>{step.titulo}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>{step.desc}</p>
                </div>
              );
            })}
          </div>

          <div className={`text-center ${visible.como ? 'animate-rise d4' : ''}`} style={{ marginTop: 56 }}>
            <button className="btn btn-red btn-lg" onClick={() => navigate('imoveis')}>
              Começar agora <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          DIFERENCIAIS — split layout
      ══════════════════════════════════════════════════════════ */}
      <section data-s="difs" style={{ padding: '100px 0', background: 'white' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 80, alignItems: 'center' }} className="difs-grid">
            {/* Left: text */}
            <div className={visible.difs ? 'animate-rise' : ''}>
              <p className="subheading">Por que Escolher a</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', marginTop: 8, marginBottom: 20 }}>VilaVix Imóveis</h2>
              <p style={{ color: 'var(--text2)', lineHeight: 1.8, fontSize: '1rem', marginBottom: 36 }}>
                Mais de 15 anos conectando famílias e investidores aos melhores imóveis da Grande Vitória. Nossa missão é transformar o processo de compra em uma experiência tranquila e segura.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
                {['Mais de 1.200 clientes atendidos', 'Equipe jurídica especializada', 'Atendimento personalizado 7 dias', 'Parceria com os maiores bancos'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(198,40,40,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={13} style={{ color: 'var(--red)' }} />
                    </div>
                    <span style={{ fontSize: '0.92rem', color: 'var(--text2)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={() => navigate('sobre')}>Conheça nossa história <ArrowRight size={16} /></button>
            </div>

            {/* Right: 2×2 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {DIFERENCIAIS.map((d, i) => {
                const Icon = d.Icon;
                return (
                  <div key={i} className={`card ${visible.difs ? `animate-rise d${i+1}` : ''}`} style={{ padding: 28 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `${d.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Icon size={22} style={{ color: d.color }} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.05rem', marginBottom: 8 }}>{d.titulo}</h3>
                    <p style={{ color: 'var(--text3)', fontSize: '0.83rem', lineHeight: 1.65 }}>{d.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          DEPOIMENTOS
      ══════════════════════════════════════════════════════════ */}
      <section data-s="depos" style={{ padding: '100px 0', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative quote mark */}
        <div style={{ position: 'absolute', top: 40, right: '5%', fontFamily: 'var(--font-display)', fontSize: '18rem', color: 'rgba(21,32,54,0.03)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>"</div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className={`text-center ${visible.depos ? 'animate-rise' : ''}`} style={{ marginBottom: 56 }}>
            <p className="subheading">Depoimentos</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', marginTop: 8 }}>O que Dizem Nossos Clientes</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }} className="depos-grid">
            {DEPOIMENTOS.map((d, i) => (
              <div key={i} className={`card ${visible.depos ? `animate-rise d${i+1}` : ''}`} style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column' }}>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                  {Array.from({ length: d.stars }).map((_, s) => <Star key={s} size={14} fill="#F59E0B" stroke="none" />)}
                </div>
                {/* Quote */}
                <div style={{ fontSize: '2.8rem', fontFamily: 'var(--font-display)', color: 'var(--red)', lineHeight: 0.8, marginBottom: 12, opacity: 0.35 }}>"</div>
                <p style={{ color: 'var(--text2)', lineHeight: 1.75, fontSize: '0.95rem', fontStyle: 'italic', flex: 1, marginBottom: 28 }}>{d.texto}</p>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                  <div className="avatar" style={{ background: 'var(--navy)' }}>
                    {d.nome.split(' ').slice(0,2).map(w => w[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>{d.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{d.cargo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BLOG
      ══════════════════════════════════════════════════════════ */}
      <section data-s="blog" style={{ padding: '100px 0', background: 'white' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 56 }}>
            <div className={visible.blog ? 'animate-rise' : ''}>
              <p className="subheading">Conteúdo & Dicas</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', marginTop: 8 }}>Blog VilaVix</h2>
              <p style={{ color: 'var(--text3)', marginTop: 10, fontSize: '0.95rem' }}>Dicas, tendências e guias para você tomar as melhores decisões imobiliárias</p>
            </div>
            <button className={`btn btn-outline ${visible.blog ? 'animate-rise d2' : ''}`} onClick={() => navigate('blog')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Ver todos os artigos <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 28, alignItems: 'start' }} className="blog-grid">
            {blogPosts.map((post, i) => {
              const catStyle = CAT_COLORS[post.categoria] || CAT_COLORS.Mercado;
              const isBig = i === 0;
              return (
                <div
                  key={post.id}
                  className={`card ${visible.blog ? `animate-rise d${i+1}` : ''}`}
                  onClick={() => navigate('blog')}
                  style={{ overflow: 'hidden', cursor: 'pointer', gridRow: isBig ? 'span 1' : 'auto' }}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', height: isBig ? 260 : 180, overflow: 'hidden' }}>
                    <img src={post.img} alt={post.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s var(--ease)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                    {/* Category pill */}
                    <div style={{ position: 'absolute', top: 14, left: 14 }}>
                      <span style={{ padding: '4px 12px', borderRadius: 99, background: catStyle.bg, color: catStyle.color, fontSize: '0.7rem', fontWeight: 700, backdropFilter: 'blur(8px)', border: `1px solid ${catStyle.color}22` }}>
                        {post.categoria}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: isBig ? '24px 28px' : '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text3)' }}>
                        <Clock size={11} /> {post.leitura} min de leitura
                      </span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text4)' }} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{formatDataBlog(post.data)}</span>
                    </div>

                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: isBig ? '1.3rem' : '1.05rem', lineHeight: 1.3, marginBottom: 10, fontWeight: 600 }}>
                      {post.titulo}
                    </h3>

                    {isBig && (
                      <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 20 }}>{post.resumo}</p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--line)', marginTop: isBig ? 0 : 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.62rem', background: 'var(--navy)' }}>
                          {post.autor.split(' ').slice(0,2).map(w => w[0]).join('')}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text2)', fontWeight: 500 }}>{post.autor.split(' ')[0]}</span>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600, color: 'var(--red)' }}>
                        Ler artigo <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════════ */}
      <section data-s="cta" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Full-bleed background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,21,38,0.95) 0%, rgba(21,32,54,0.85) 50%, rgba(198,40,40,0.25) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '100px 32px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 80, alignItems: 'center' }} >
          {/* Left */}
          <div className={visible.cta ? 'animate-rise' : ''}>
            <p style={{ color: '#EF9A9A', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Pronto para começar?</p>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 'clamp(2.2rem, 4vw, 3.8rem)', fontWeight: 300, lineHeight: 1.1, marginBottom: 12 }}>
              Encontre seu imóvel<br /><em style={{ fontWeight: 700 }}>ainda hoje</em>
            </h2>
            <div style={{ width: 56, height: 3, background: 'var(--red)', borderRadius: 2, marginBottom: 24 }} />
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.75, maxWidth: 440 }}>
              Nossa equipe de corretores especializados está pronta para apresentar as melhores oportunidades do mercado imobiliário da Grande Vitória.
            </p>
          </div>

          {/* Right: contact card */}
          <div className={visible.cta ? 'animate-rise d2' : ''}>
            <div className="glass" style={{ padding: '36px 32px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.4rem', marginBottom: 8 }}>Fale com um corretor</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginBottom: 28 }}>Atendimento de segunda a sábado, das 8h às 20h</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href={wppLink(WPP_NUMBER, WPP_DEFAULT_MSG)} target="_blank" rel="noopener noreferrer" className="btn btn-wpp btn-lg" style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem' }}>
                  <MessageCircle size={19} /> Falar no WhatsApp
                </a>
                <button className="btn btn-ghost" onClick={() => navigate('contato')} style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem' }}>
                  <Phone size={19} /> Fale Conosco
                </button>
              </div>
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.10)', display: 'flex', gap: 20, justifyContent: 'center' }}>
                {['Resposta imediata', '100% Gratuito', 'Sem compromisso'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                    <CheckCircle size={12} style={{ color: '#4ADE80' }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 1024px) {
          .bairros-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .difs-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .blog-grid { grid-template-columns: 1fr 1fr !important; }
          .depos-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 768px) {
          .bairros-grid { grid-template-columns: 1fr 1fr !important; }
          .blog-grid { grid-template-columns: 1fr !important; }
          .depos-grid { grid-template-columns: 1fr !important; }
          .hero-float-card { display: none !important; }
        }
        @media (max-width: 640px) {
          .bairros-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
