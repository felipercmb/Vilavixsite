import React from 'react';
import { BedDouble, Bath, Car, Maximize2, MapPin, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/helpers.js';

const TIPO_BADGE = {
  Apartamento: { bg: 'rgba(59,130,246,0.12)',  color: '#1D4ED8' },
  Casa:        { bg: 'rgba(16,185,129,0.12)',   color: '#059669' },
  Cobertura:   { bg: 'rgba(139,92,246,0.12)',   color: '#6D28D9' },
  Terreno:     { bg: 'rgba(245,158,11,0.12)',   color: '#B45309' },
  Comercial:   { bg: 'rgba(236,72,153,0.12)',   color: '#BE185D' },
};

const TRANS_BADGE = {
  Venda:   { bg: 'rgba(21,32,54,0.10)',   color: '#152036' },
  Aluguel: { bg: 'rgba(198,40,40,0.10)', color: '#C62828' },
};

export default function ImovelCard({ imovel, view = 'grid', navigate }) {
  const { titulo, tipo, transacao, preco, quartos, banheiros, vagas, area, bairro, cidade, img, status } = imovel;
  const tipoBadge  = TIPO_BADGE[tipo]  || { bg: '#eee', color: '#555' };
  const transBadge = TRANS_BADGE[transacao] || { bg: '#eee', color: '#555' };
  const isAluguel  = transacao === 'Aluguel';
  const isSold     = status === 'vendido' || status === 'reservado';

  if (view === 'list') {
    return (
      <div
        className="card"
        onClick={() => navigate('imovel-detail', { imovelId: imovel.id })}
        style={{ display: 'flex', gap: 0, cursor: 'pointer', overflow: 'hidden' }}
      >
        {/* Image */}
        <div style={{ position: 'relative', width: 240, flexShrink: 0 }}>
          <img
            src={img}
            alt={titulo}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {isSold && (
            <div style={soldOverlay}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {status === 'vendido' ? 'Vendido' : 'Reservado'}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ ...badgeStyle, background: tipoBadge.bg, color: tipoBadge.color }}>{tipo}</span>
              <span style={{ ...badgeStyle, background: transBadge.bg, color: transBadge.color }}>{transacao}</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 6, lineHeight: 1.3 }}>
              {titulo}
            </h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontSize: '0.83rem' }}>
              <MapPin size={13} />
              {bairro}, {cidade}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 20 }}>
              {quartos > 0 && <Spec Icon={BedDouble} val={`${quartos} qtos`} />}
              {banheiros > 0 && <Spec Icon={Bath} val={`${banheiros} ban`} />}
              {vagas > 0 && <Spec Icon={Car} val={`${vagas} vaga${vagas > 1 ? 's' : ''}`} />}
              <Spec Icon={Maximize2} val={`${area} m²`} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1 }}>
                {formatCurrency(preco)}
              </div>
              {isAluguel && <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>/mês</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className="card"
      onClick={() => navigate('imovel-detail', { imovelId: imovel.id })}
      style={{ cursor: 'pointer', overflow: 'hidden' }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <img
          src={img}
          alt={titulo}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        {/* Badges overlay */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
          <span style={{ ...badgeStyle, background: 'rgba(255,255,255,0.92)', color: tipoBadge.color, backdropFilter: 'blur(8px)' }}>{tipo}</span>
          <span style={{ ...badgeStyle, background: transacao === 'Aluguel' ? 'rgba(198,40,40,0.90)' : 'rgba(21,32,54,0.82)', color: 'white', backdropFilter: 'blur(8px)' }}>{transacao}</span>
        </div>
        {isSold && <div style={soldOverlay}><span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{status === 'vendido' ? 'Vendido' : 'Reservado'}</span></div>}
      </div>

      {/* Body */}
      <div style={{ padding: '20px 20px 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 6, lineHeight: 1.3 }}>
          {titulo}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontSize: '0.82rem', marginBottom: 16 }}>
          <MapPin size={13} />
          {bairro}, {cidade}
        </div>

        {/* Specs row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          {quartos > 0 && <Spec Icon={BedDouble} val={quartos} />}
          {banheiros > 0 && <Spec Icon={Bath} val={banheiros} />}
          {vagas > 0 && <Spec Icon={Car} val={vagas} />}
          <Spec Icon={Maximize2} val={`${area}m²`} />
        </div>

        {/* Price + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1 }}>
              {formatCurrency(preco)}
            </div>
            {isAluguel && <div style={{ fontSize: '0.73rem', color: 'var(--text3)', marginTop: 2 }}>/mês</div>}
          </div>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--navy)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--navy)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ Icon, val }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text2)', fontSize: '0.82rem' }}>
      <Icon size={14} strokeWidth={1.8} />
      <span>{val}</span>
    </div>
  );
}

const badgeStyle = {
  display: 'inline-flex', alignItems: 'center',
  padding: '3px 10px', borderRadius: 20,
  fontSize: '0.72rem', fontWeight: 600,
  whiteSpace: 'nowrap',
};

const soldOverlay = {
  position: 'absolute', inset: 0,
  background: 'rgba(21,32,54,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(2px)',
};
