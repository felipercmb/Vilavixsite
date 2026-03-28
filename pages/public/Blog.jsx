import React, { useState, useMemo, useEffect } from 'react';
import { Search, Clock, ChevronRight, ArrowRight, MessageCircle } from 'lucide-react';
import { posts, CATEGORIAS_BLOG, formatDataBlog } from '../../data/blog.js';
import { wppLink, WPP_NUMBER, WPP_DEFAULT_MSG } from '../../utils/helpers.js';

const CAT_COLORS = {
  Financiamento: { bg: 'rgba(59,130,246,0.12)',  color: '#1D4ED8' },
  Mercado:       { bg: 'rgba(245,158,11,0.12)',  color: '#B45309' },
  Jurídico:      { bg: 'rgba(139,92,246,0.12)',  color: '#6D28D9' },
  Investimento:  { bg: 'rgba(16,185,129,0.12)',  color: '#065F46' },
  Lifestyle:     { bg: 'rgba(236,72,153,0.12)',  color: '#BE185D' },
};

export default function Blog({ navigate }) {
  const [categoria, setCategoria] = useState('Todos');
  const [busca, setBusca]         = useState('');
  const [visible, setVisible]     = useState({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setVisible(p => ({ ...p, [e.target.dataset.s]: true }));
      }),
      { threshold: 0.10 }
    );
    document.querySelectorAll('[data-s]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return posts.filter(p => {
      if (categoria !== 'Todos' && p.categoria !== categoria) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!`${p.titulo} ${p.resumo} ${p.autor} ${p.categoria}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [categoria, busca]);

  const destaque = posts.find(p => p.destaque);
  const resto    = filtered.filter(p => !p.destaque || categoria !== 'Todos' || busca);

  return (
    <main style={{ paddingTop: 'var(--header-h)' }}>

      {/* ── Hero do blog ── */}
      <section style={{ padding: '72px 0 56px', background: 'var(--navy)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <p style={{ color: '#EF9A9A', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Conteúdo & Dicas</p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 'clamp(2.2rem, 4vw, 3.6rem)', fontWeight: 400, marginBottom: 16 }}>
            Blog <em style={{ fontWeight: 700 }}>VilaVix</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Dicas, tendências de mercado e guias completos para você tomar as melhores decisões imobiliárias.
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 440, margin: '0 auto' }}>
            <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
            <input
              placeholder="Buscar artigo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontFamily: 'var(--font-body)', fontSize: '0.94rem', outline: 'none', backdropFilter: 'blur(12px)' }}
            />
          </div>
        </div>
      </section>

      {/* ── Category filters ── */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', position: 'sticky', top: 'var(--header-h)', zIndex: 10 }}>
        <div className="container" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 32px', scrollbarWidth: 'none' }}>
          {CATEGORIAS_BLOG.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              style={{
                padding: '7px 18px', borderRadius: 99, border: '1.5px solid', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                borderColor: categoria === cat ? 'var(--navy)' : 'var(--line2)',
                background:  categoria === cat ? 'var(--navy)' : 'transparent',
                color:       categoria === cat ? 'white' : 'var(--text3)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '64px 0 100px', background: 'var(--bg)' }}>
        <div className="container">

          {/* Featured post (only when no filter) */}
          {categoria === 'Todos' && !busca && destaque && (
            <div data-s="feat" className={`card ${visible.feat ? 'animate-rise' : ''}`} style={{ overflow: 'hidden', marginBottom: 56, cursor: 'pointer', display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: 340 }} onClick={() => {}}>
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <img src={destaque.img} alt={destaque.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 340, transition: 'transform 0.6s var(--ease)' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{ position: 'absolute', top: 20, left: 20 }}>
                  <span style={{ padding: '5px 14px', borderRadius: 99, background: 'var(--red)', color: 'white', fontSize: '0.72rem', fontWeight: 700 }}>Em Destaque</span>
                </div>
              </div>
              <div style={{ padding: '40px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {(() => {
                  const cs = CAT_COLORS[destaque.categoria] || CAT_COLORS.Mercado;
                  return (
                    <span style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '4px 12px', borderRadius: 99, background: cs.bg, color: cs.color, fontSize: '0.72rem', fontWeight: 700, marginBottom: 16 }}>
                      {destaque.categoria}
                    </span>
                  );
                })()}
                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.7rem', lineHeight: 1.25, marginBottom: 12 }}>{destaque.titulo}</h2>
                <p style={{ color: 'var(--text2)', fontSize: '0.92rem', lineHeight: 1.75, marginBottom: 24 }}>{destaque.resumo}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.65rem', background: 'var(--navy)' }}>
                      {destaque.autor.split(' ').slice(0,2).map(w => w[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--navy)' }}>{destaque.autor.split(' ')[0]}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text3)' }}>
                        <Clock size={10} /> {destaque.leitura} min · {formatDataBlog(destaque.data)}
                      </div>
                    </div>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 700, color: 'var(--red)' }}>
                    Ler <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Results count */}
          <p style={{ fontSize: '0.82rem', color: 'var(--text3)', marginBottom: 28 }}>
            {filtered.length} artigo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            {categoria !== 'Todos' && ` em "${categoria}"`}
          </p>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text3)' }}>
              <Search size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
              <p>Nenhum artigo encontrado.</p>
            </div>
          ) : (
            <div data-s="posts" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }} className="blog-posts-grid">
              {(categoria !== 'Todos' || busca ? filtered : filtered.filter(p => !p.destaque)).map((post, i) => {
                const cs = CAT_COLORS[post.categoria] || CAT_COLORS.Mercado;
                return (
                  <div key={post.id} className={`card ${visible.posts ? `animate-rise d${Math.min(i+1,6)}` : ''}`} style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => {}}>
                    <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                      <img src={post.img} alt={post.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s var(--ease)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                      <span style={{ position: 'absolute', top: 12, left: 12, padding: '3px 10px', borderRadius: 99, background: cs.bg, color: cs.color, fontSize: '0.68rem', fontWeight: 700, backdropFilter: 'blur(8px)' }}>
                        {post.categoria}
                      </span>
                    </div>
                    <div style={{ padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.7rem', color: 'var(--text3)' }}>
                        <Clock size={11} /> {post.leitura} min
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text4)' }} />
                        {formatDataBlog(post.data)}
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.08rem', lineHeight: 1.3, marginBottom: 10 }}>{post.titulo}</h3>
                      <p style={{ color: 'var(--text3)', fontSize: '0.82rem', lineHeight: 1.65, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.resumo}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ width: 26, height: 26, fontSize: '0.58rem', background: 'var(--navy)' }}>
                            {post.autor.split(' ').slice(0,2).map(w => w[0]).join('')}
                          </div>
                          <span style={{ fontSize: '0.73rem', color: 'var(--text2)', fontWeight: 500 }}>{post.autor.split(' ')[0]}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          Ler <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Newsletter CTA ── */}
      <section style={{ padding: '72px 0', background: 'var(--navy)' }}>
        <div className="container" style={{ maxWidth: 640, textAlign: 'center' }}>
          <p style={{ color: '#EF9A9A', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Fique por dentro</p>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '2rem', fontWeight: 400, marginBottom: 12 }}>
            Receba as <em style={{ fontWeight: 700 }}>melhores dicas</em> no seu WhatsApp
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.92rem', marginBottom: 32, lineHeight: 1.7 }}>
            Novos artigos, tendências de mercado e oportunidades exclusivas diretamente para você.
          </p>
          <a href={wppLink(WPP_NUMBER, 'Olá! Gostaria de receber dicas e artigos do blog VilaVix.')} target="_blank" rel="noopener noreferrer" className="btn btn-wpp btn-lg">
            <MessageCircle size={19} /> Entrar no grupo de dicas
          </a>
        </div>
      </section>

      <style>{`
        @media (max-width: 1024px) { .blog-posts-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px)  { .blog-posts-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  );
}
