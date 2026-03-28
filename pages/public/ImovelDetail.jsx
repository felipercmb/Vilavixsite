import React, { useState } from 'react';
import { ArrowLeft, BedDouble, Bath, Car, Maximize2, MapPin, Phone, MessageCircle, Calendar, ChevronLeft, ChevronRight, Shield, CheckCircle } from 'lucide-react';
import { imoveis } from '../../data/imoveis.js';
import { formatCurrency, wppLink, wppImovelMsg, WPP_NUMBER } from '../../utils/helpers.js';

const TIPO_COLORS = {
  Apartamento: '#3B82F6', Casa: '#10B981', Cobertura: '#8B5CF6',
  Terreno: '#F59E0B', Comercial: '#EC4899',
};

export default function ImovelDetailPage({ navigate, imovelId }) {
  const imovel = imoveis.find((i) => i.id === imovelId) || imoveis[0];
  const {
    titulo, tipo, transacao, preco, quartos, banheiros, vagas, area,
    bairro, cidade, endereco, fotos, status, descricao,
    condominio, iptu, andar, ano,
  } = imovel;

  const [activePhoto, setActivePhoto] = useState(0);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', mensagem: '' });

  const allPhotos = fotos || [imovel.img];
  const isAluguel = transacao === 'Aluguel';
  const tipColor  = TIPO_COLORS[tipo] || '#152036';

  const handleForm = (e) => {
    e.preventDefault();
    setFormSent(true);
  };

  return (
    <main style={{ paddingTop: 'var(--header-h)', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="container" style={{ padding: '32px 32px 80px' }}>
        {/* Back */}
        <button
          onClick={() => navigate('imoveis')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: 24, padding: '8px 0', fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft size={18} />
          Voltar para imóveis
        </button>

        {/* Badges + title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: `${tipColor}15`, color: tipColor }}>{tipo}</span>
            <span className="badge" style={{ background: isAluguel ? 'var(--red-light)' : 'rgba(21,32,54,0.10)', color: isAluguel ? 'var(--red)' : 'var(--navy)' }}>{transacao}</span>
            {status !== 'ativo' && (
              <span className="badge badge-amber">{status === 'vendido' ? 'Vendido' : 'Reservado'}</span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--navy)', marginBottom: 8 }}>
            {titulo}
          </h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: '0.9rem' }}>
            <MapPin size={15} />
            {endereco}
          </p>
        </div>

        {/* Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }} className="detail-layout">
          {/* Left column */}
          <div>
            {/* Gallery */}
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24, background: 'black', position: 'relative' }}>
              {/* Main photo */}
              <div style={{ position: 'relative', height: 460 }}>
                <img
                  src={allPhotos[activePhoto]}
                  alt={titulo}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Navigation arrows */}
                {allPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setActivePhoto((p) => (p - 1 + allPhotos.length) % allPhotos.length)}
                      style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.90)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)' }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setActivePhoto((p) => (p + 1) % allPhotos.length)}
                      style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.90)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)' }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
                <div style={{ position: 'absolute', bottom: 16, right: 16, background: 'rgba(0,0,0,0.55)', color: 'white', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', backdropFilter: 'blur(8px)' }}>
                  {activePhoto + 1} / {allPhotos.length}
                </div>
              </div>

              {/* Thumbnails */}
              {allPhotos.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allPhotos.length}, 1fr)`, gap: 3 }}>
                  {allPhotos.map((ph, i) => (
                    <div
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      style={{ height: 80, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                    >
                      <img src={ph} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
                      {i !== activePhoto && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />}
                      {i === activePhoto && <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--red)' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specs boxes */}
            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20, fontSize: '1.2rem' }}>Características</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { Icon: BedDouble, label: 'Quartos',  val: quartos > 0 ? quartos : '—'      },
                  { Icon: Bath,      label: 'Banheiros', val: banheiros > 0 ? banheiros : '—' },
                  { Icon: Car,       label: 'Vagas',     val: vagas > 0 ? vagas : '—'         },
                  { Icon: Maximize2, label: 'Área',      val: `${area} m²`                    },
                ].map(({ Icon, label, val }, i) => (
                  <div
                    key={i}
                    style={{ textAlign: 'center', padding: '20px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <Icon size={22} style={{ color: 'var(--navy)' }} strokeWidth={1.6} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, fontSize: '1.2rem' }}>Descrição</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.75, fontSize: '0.97rem' }}>{descricao}</p>
            </div>

            {/* Additional details */}
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20, fontSize: '1.2rem' }}>Detalhes adicionais</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Condomínio',  val: condominio > 0 ? formatCurrency(condominio) + '/mês' : 'Sem condomínio' },
                  { label: 'IPTU',        val: iptu > 0 ? formatCurrency(iptu) + '/ano' : '—' },
                  { label: 'Andar',       val: andar || '—' },
                  { label: 'Ano de construção', val: ano ? String(ano) : 'A consultar' },
                  { label: 'Cidade',      val: `${bairro}, ${cidade}` },
                  { label: 'Tipo de negócio', val: transacao },
                ].map(({ label, val }, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--text3)', fontSize: '0.88rem' }}>{label}</span>
                    <span style={{ color: 'var(--text)', fontSize: '0.88rem', fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar (sticky) */}
          <div style={{ position: 'sticky', top: 'calc(var(--header-h) + 24px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Price card */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 600, color: 'var(--navy)', lineHeight: 1, marginBottom: 4 }}>
                {formatCurrency(preco)}
              </div>
              {isAluguel && <div style={{ color: 'var(--text3)', fontSize: '0.85rem', marginBottom: 16 }}>/mês</div>}
              {!isAluguel && <div style={{ marginBottom: 16 }} />}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a
                  href={wppLink(WPP_NUMBER, wppImovelMsg(titulo, imovel.id))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-wpp"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <MessageCircle size={18} />
                  Tenho interesse
                </a>

                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setPhoneRevealed(true)}
                >
                  <Phone size={18} />
                  {phoneRevealed ? '(27) 3344-9900' : 'Revelar telefone'}
                </button>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    const msg = `Olá! Gostaria de agendar uma visita ao imóvel "${titulo}" (Ref: #${imovel.id}).`;
                    window.open(wppLink(WPP_NUMBER, msg), '_blank');
                  }}
                >
                  <Calendar size={18} />
                  Agendar visita
                </button>
              </div>

              <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.4 }}>
                  Negociação segura. Documentação verificada pela equipe VilaVix.
                </span>
              </div>
            </div>

            {/* Contact form */}
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 20 }}>
                Enviar mensagem
              </h3>

              {formSent ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle size={40} style={{ color: 'var(--green)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>Mensagem enviada!</p>
                  <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>Entraremos em contato em breve.</p>
                </div>
              ) : (
                <form onSubmit={handleForm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="label">Nome</label>
                    <input className="input" placeholder="Seu nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Telefone</label>
                    <input className="input" placeholder="(27) 99999-9999" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">E-mail</label>
                    <input className="input" type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Mensagem</label>
                    <textarea className="textarea" placeholder="Tenho interesse neste imóvel..." value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} style={{ minHeight: 90 }} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Enviar mensagem
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .detail-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .detail-layout > div:last-child { position: static !important; }
        }
      `}</style>
    </main>
  );
}
