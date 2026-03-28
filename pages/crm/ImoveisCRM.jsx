import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, Search, X, ChevronLeft, ChevronRight, Pencil, Trash2,
  Eye, LayoutGrid, List, BedDouble, Bath, Car, Maximize2,
  MapPin, Building2, Star, Check, Users, ArrowUpRight,
  Home, Tag, Calendar, DollarSign, Save, XCircle,
} from 'lucide-react';
import { formatCurrency, formatCurrencyShort, TIPOS_IMOVEL, TRANSACOES } from '../../utils/helpers.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  ativo:     { label: 'Ativo',     bg: 'rgba(16,185,129,0.12)', color: '#059669', dot: '#10B981' },
  reservado: { label: 'Reservado', bg: 'rgba(245,158,11,0.12)', color: '#B45309', dot: '#F59E0B' },
  vendido:   { label: 'Vendido',   bg: 'rgba(21,32,54,0.08)',   color: '#152036', dot: '#6B7280' },
};

const TIPO_COLOR = {
  Apartamento: '#3B82F6',
  Casa:        '#10B981',
  Cobertura:   '#8B5CF6',
  Terreno:     '#F59E0B',
  Comercial:   '#EC4899',
};

const EMPTY_FORM = {
  titulo: '', tipo: 'Apartamento', transacao: 'Venda', status: 'ativo',
  preco: '', area: '', quartos: '', banheiros: '', vagas: '',
  bairro: '', cidade: 'Vitória', endereco: '', andar: '', ano: '',
  condominio: '', iptu: '', descricao: '', img: '', destaque: false,
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.ativo;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '3px 9px' : '5px 12px',
      borderRadius: 20, background: cfg.bg,
      fontSize: size === 'sm' ? '0.72rem' : '0.8rem', fontWeight: 600, color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ImovelCard({ im, selected, onClick, leadsCount }) {
  const color = TIPO_COLOR[im.tipo] || '#6B7280';
  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: 0, overflow: 'hidden', cursor: 'pointer',
        border: selected ? '2px solid var(--navy)' : '1px solid var(--line)',
        transition: 'all 0.2s ease', transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
        <img src={im.img} alt={im.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
        {/* Badges over image */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          <span style={{ background: color, color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{im.tipo}</span>
          {im.destaque && <span style={{ background: '#F59E0B', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 3 }}><Star size={9} fill="white" /> Destaque</span>}
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <StatusBadge status={im.status} />
        </div>
        {/* Price */}
        <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {formatCurrencyShort(im.preco)}
            {im.transacao === 'Aluguel' && <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: 2 }}>/mês</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.titulo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: '0.75rem', marginBottom: 12 }}>
          <MapPin size={11} />{im.bairro}, {im.cidade}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          {im.quartos > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text2)' }}>
              <BedDouble size={13} style={{ color: 'var(--text3)' }} />{im.quartos}
            </div>
          )}
          {im.banheiros > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text2)' }}>
              <Bath size={13} style={{ color: 'var(--text3)' }} />{im.banheiros}
            </div>
          )}
          {im.vagas > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text2)' }}>
              <Car size={13} style={{ color: 'var(--text3)' }} />{im.vagas}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text2)' }}>
            <Maximize2 size={13} style={{ color: 'var(--text3)' }} />{im.area}m²
          </div>
          {leadsCount > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#3B82F6', fontWeight: 600 }}>
              <Users size={11} />{leadsCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoGallery({ fotos, titulo }) {
  const [idx, setIdx] = useState(0);
  if (!fotos?.length) return null;
  return (
    <div style={{ position: 'relative', height: 240, background: '#000', overflow: 'hidden' }}>
      <img
        key={idx}
        src={fotos[idx]}
        alt={titulo}
        style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'fadeIn 0.3s ease' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />

      {fotos.length > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + fotos.length) % fotos.length)}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setIdx(i => (i + 1) % fotos.length)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
            {fotos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, background: i === idx ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', padding: 0 }} />
            ))}
          </div>
        </>
      )}
      <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 8 }}>
        {idx + 1}/{fotos.length}
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', background: 'var(--bg)', borderRadius: 12, flex: 1 }}>
      <Icon size={15} style={{ color: 'var(--text3)' }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{label}</span>
    </div>
  );
}

function DetailPanel({ im, leads, onEdit, onDelete, onClose }) {
  const linkedLeads = leads.filter(l => l.imovelId === im.id);
  const color = TIPO_COLOR[im.tipo] || '#6B7280';
  const [tab, setTab] = useState('detalhes');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Gallery */}
      <PhotoGallery fotos={im.fotos || [im.img]} titulo={im.titulo} />

      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: color, background: `${color}18`, padding: '2px 8px', borderRadius: 99 }}>{im.tipo}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: im.transacao === 'Aluguel' ? 'var(--red)' : 'var(--text2)', background: im.transacao === 'Aluguel' ? 'var(--red-light)' : 'var(--bg3)', padding: '2px 8px', borderRadius: 99 }}>{im.transacao}</span>
              {im.destaque && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 3 }}><Star size={9} fill="#B45309" /> Destaque</span>}
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.1rem', lineHeight: 1.2 }}>{im.titulo}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} /> {im.bairro}, {im.cidade} · Ref. #{im.id}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Price + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)' }}>
              {formatCurrency(im.preco)}
            </span>
            {im.transacao === 'Aluguel' && <span style={{ fontSize: '0.78rem', color: 'var(--text3)', marginLeft: 4 }}>/mês</span>}
          </div>
          <StatusBadge status={im.status} size="md" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 20px' }}>
        {[['detalhes', 'Detalhes'], ['leads', `Leads (${linkedLeads.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '11px 16px', fontSize: '0.82rem', fontWeight: tab === id ? 600 : 400, color: tab === id ? 'var(--navy)' : 'var(--text3)', background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? 'var(--navy)' : 'transparent'}`, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s', marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '18px 20px', flex: 1 }}>
        {tab === 'detalhes' && (
          <>
            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {im.quartos > 0 && <StatItem icon={BedDouble} label="Quartos" value={im.quartos} />}
              {im.banheiros > 0 && <StatItem icon={Bath} label="Banhs." value={im.banheiros} />}
              {im.vagas > 0 && <StatItem icon={Car} label="Vagas" value={im.vagas} />}
              <StatItem icon={Maximize2} label="Área" value={`${im.area}m²`} />
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Andar',      value: im.andar || '—' },
                { label: 'Ano',        value: im.ano || '—' },
                { label: 'Condomínio', value: im.condominio ? `R$ ${im.condominio.toLocaleString('pt-BR')}/mês` : 'Sem condomínio' },
                { label: 'IPTU',       value: im.iptu ? `R$ ${im.iptu.toLocaleString('pt-BR')}/ano` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--navy)' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Address */}
            {im.endereco && (
              <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 10, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MapPin size={14} style={{ color: 'var(--red)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endereço completo</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--navy)', lineHeight: 1.4 }}>{im.endereco}</div>
                </div>
              </div>
            )}

            {/* Description */}
            {im.descricao && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.67rem', color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Descrição</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.65 }}>{im.descricao}</p>
              </div>
            )}
          </>
        )}

        {tab === 'leads' && (
          <div>
            {linkedLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
                <Users size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem' }}>Nenhum lead vinculado a este imóvel</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedLeads.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 12 }}>
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.7rem', flexShrink: 0 }}>
                      {l.nome.split(' ').slice(0,2).map(w => w[0]).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{l.corretor} · {l.orcamento}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                      {(() => {
                        const labels = { novo: 'Novo', contato: 'Contato', visita: 'Visita', proposta: 'Proposta', fechado: 'Fechado' };
                        const colors = { novo: '#3B82F6', contato: '#F59E0B', visita: '#8B5CF6', proposta: '#EC4899', fechado: '#10B981' };
                        return <span style={{ color: colors[l.status], background: `${colors[l.status]}18`, padding: '2px 8px', borderRadius: 99 }}>{labels[l.status]}</span>;
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
        <button onClick={onEdit} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
          <Pencil size={14} /> Editar imóvel
        </button>
        <button onClick={onDelete}
          style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--line2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--line2)'; }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function EditForm({ im, onSave, onCancel }) {
  const [form, setForm] = useState({
    titulo:     im.titulo     || '',
    tipo:       im.tipo       || 'Apartamento',
    transacao:  im.transacao  || 'Venda',
    status:     im.status     || 'ativo',
    preco:      im.preco      || '',
    area:       im.area       || '',
    quartos:    im.quartos    ?? '',
    banheiros:  im.banheiros  ?? '',
    vagas:      im.vagas      ?? '',
    bairro:     im.bairro     || '',
    cidade:     im.cidade     || 'Vitória',
    endereco:   im.endereco   || '',
    andar:      im.andar      || '',
    ano:        im.ano        || '',
    condominio: im.condominio ?? '',
    iptu:       im.iptu       ?? '',
    descricao:  im.descricao  || '',
    img:        im.img        || '',
    destaque:   im.destaque   || false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.titulo.trim()) return alert('Informe o título do imóvel');
    if (!form.preco)         return alert('Informe o preço');
    onSave({
      ...form,
      preco:      Number(form.preco),
      area:       Number(form.area),
      quartos:    Number(form.quartos),
      banheiros:  Number(form.banheiros),
      vagas:      Number(form.vagas),
      condominio: Number(form.condominio),
      iptu:       Number(form.iptu),
      ano:        form.ano ? Number(form.ano) : null,
    });
  };

  const F = ({ label, children, col = 1 }) => (
    <div style={{ gridColumn: `span ${col}` }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line2)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)', background: 'white' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onCancel} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={16} />
        </button>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1rem' }}>Editar imóvel</h3>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          <F label="Título" col={2}>
            <input style={inp} value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Nome do imóvel" />
          </F>

          <F label="Tipo">
            <select style={inp} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS_IMOVEL.map(t => <option key={t}>{t}</option>)}
            </select>
          </F>

          <F label="Negócio">
            <select style={inp} value={form.transacao} onChange={e => set('transacao', e.target.value)}>
              {TRANSACOES.map(t => <option key={t}>{t}</option>)}
            </select>
          </F>

          <F label="Status">
            <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
          </F>

          <F label={`Preço ${form.transacao === 'Aluguel' ? '(R$/mês)' : '(R$)'}`}>
            <input style={inp} type="number" value={form.preco} onChange={e => set('preco', e.target.value)} placeholder="0" />
          </F>

          <F label="Área (m²)">
            <input style={inp} type="number" value={form.area} onChange={e => set('area', e.target.value)} placeholder="0" />
          </F>

          <F label="Quartos">
            <input style={inp} type="number" value={form.quartos} onChange={e => set('quartos', e.target.value)} placeholder="0" />
          </F>

          <F label="Banheiros">
            <input style={inp} type="number" value={form.banheiros} onChange={e => set('banheiros', e.target.value)} placeholder="0" />
          </F>

          <F label="Vagas">
            <input style={inp} type="number" value={form.vagas} onChange={e => set('vagas', e.target.value)} placeholder="0" />
          </F>

          <F label="Andar">
            <input style={inp} value={form.andar} onChange={e => set('andar', e.target.value)} placeholder="Ex: 8º andar" />
          </F>

          <F label="Bairro">
            <input style={inp} value={form.bairro} onChange={e => set('bairro', e.target.value)} placeholder="Bairro" />
          </F>

          <F label="Cidade">
            <input style={inp} value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
          </F>

          <F label="Endereço completo" col={2}>
            <input style={inp} value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, complemento" />
          </F>

          <F label="Condomínio (R$/mês)">
            <input style={inp} type="number" value={form.condominio} onChange={e => set('condominio', e.target.value)} placeholder="0" />
          </F>

          <F label="IPTU (R$/ano)">
            <input style={inp} type="number" value={form.iptu} onChange={e => set('iptu', e.target.value)} placeholder="0" />
          </F>

          <F label="Ano de construção" col={2}>
            <input style={inp} type="number" value={form.ano} onChange={e => set('ano', e.target.value)} placeholder="2020" />
          </F>

          <F label="URL da foto principal" col={2}>
            <input style={inp} value={form.img} onChange={e => set('img', e.target.value)} placeholder="https://..." />
            {form.img && <img src={form.img} alt="preview" style={{ marginTop: 8, width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />}
          </F>

          <F label="Descrição" col={2}>
            <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o imóvel..." />
          </F>

          <F label="" col={2}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--navy)' }}>
              <div onClick={() => set('destaque', !form.destaque)}
                style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.destaque ? '#F59E0B' : 'var(--line2)'}`, background: form.destaque ? '#F59E0B' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                {form.destaque && <Check size={11} strokeWidth={3} color="white" />}
              </div>
              Marcar como destaque
            </label>
          </F>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
        <button onClick={onCancel} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
        <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
          <Save size={14} /> Salvar alterações
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function ImoveisCRM({ imoveis, updateImovel, addImovel, deleteImovel, leads, setMenu, navigate }) {
  const [selected, setSelected]     = useState(null);
  const [editMode, setEditMode]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [view, setView]             = useState('grid');    // 'grid' | 'table'
  const [busca, setBusca]           = useState('');
  const [fTipo, setFTipo]           = useState('Todos');
  const [fNeg, setFNeg]             = useState('Todos');
  const [fStatus, setFStatus]       = useState('Todos');

  const selectedImovel = imoveis.find(im => im.id === selected);

  // ── Derived stats ─────────────────────────────────────────
  const ativos    = imoveis.filter(im => im.status === 'ativo').length;
  const reserv    = imoveis.filter(im => im.status === 'reservado').length;
  const vendidos  = imoveis.filter(im => im.status === 'vendido').length;
  const portfolioValue = imoveis
    .filter(im => im.transacao === 'Venda' && im.status !== 'vendido')
    .reduce((s, im) => s + im.preco, 0);

  // ── Filtered list ─────────────────────────────────────────
  const filtered = useMemo(() => imoveis.filter(im => {
    if (fTipo   !== 'Todos'  && im.tipo      !== fTipo)   return false;
    if (fNeg    !== 'Todos'  && im.transacao !== fNeg)    return false;
    if (fStatus !== 'Todos'  && im.status    !== fStatus) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return im.titulo.toLowerCase().includes(q) || im.bairro.toLowerCase().includes(q) || im.cidade.toLowerCase().includes(q);
    }
    return true;
  }), [imoveis, fTipo, fNeg, fStatus, busca]);

  const leadsCount = (imovelId) => leads.filter(l => l.imovelId === imovelId).length;

  const handleSave = (changes) => {
    updateImovel(selected, changes);
    setEditMode(false);
  };

  const handleDelete = (id) => {
    deleteImovel(id);
    if (selected === id) setSelected(null);
    setConfirmDel(null);
  };

  const handleSelect = (id) => {
    setSelected(prev => prev === id ? null : id);
    setEditMode(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.4rem' }}>Imóveis</h2>
              <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>{filtered.length} de {imoveis.length} imóveis</p>
            </div>
            <button onClick={() => setMenu('add-imovel')} className="btn btn-primary" style={{ gap: 8 }}>
              <Plus size={16} /> Cadastrar imóvel
            </button>
          </div>

          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Ativos',     value: ativos,    color: '#10B981', icon: Building2 },
              { label: 'Reservados', value: reserv,    color: '#F59E0B', icon: Tag       },
              { label: 'Vendidos',   value: vendidos,  color: '#6B7280', icon: Check     },
              { label: 'Portfólio', value: formatCurrencyShort(portfolioValue), color: '#3B82F6', icon: DollarSign },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 2 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text4)' }} />
              <input
                value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por título, bairro..."
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--line2)', fontSize: '0.83rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
              />
              {busca && <button onClick={() => setBusca('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', display: 'flex' }}><X size={14} /></button>}
            </div>

            {/* Tipo pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['Todos', ...TIPOS_IMOVEL].map(t => (
                <button key={t} onClick={() => setFTipo(t)}
                  style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${fTipo === t ? 'var(--navy)' : 'var(--line2)'}`, background: fTipo === t ? 'var(--navy)' : 'white', color: fTipo === t ? 'white' : 'var(--text2)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Negócio */}
            <select value={fNeg} onChange={e => setFNeg(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--line2)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', background: 'white' }}>
              <option value="Todos">Venda + Aluguel</option>
              <option value="Venda">Venda</option>
              <option value="Aluguel">Aluguel</option>
            </select>

            {/* Status */}
            <select value={fStatus} onChange={e => setFStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--line2)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', background: 'white' }}>
              <option value="Todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="reservado">Reservados</option>
              <option value="vendido">Vendidos</option>
            </select>

            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--line2)', borderRadius: 10, overflow: 'hidden' }}>
              {[['grid', LayoutGrid], ['table', List]].map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', background: view === v ? 'var(--navy)' : 'white', color: view === v ? 'white' : 'var(--text3)', transition: 'all 0.15s' }}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
              <Building2 size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
              <p style={{ fontSize: '0.9rem' }}>Nenhum imóvel encontrado</p>
            </div>
          ) : view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 16, transition: 'grid-template-columns 0.3s ease' }} className="imoveis-grid">
              {filtered.map(im => (
                <ImovelCard
                  key={im.id}
                  im={im}
                  selected={selected === im.id}
                  leadsCount={leadsCount(im.id)}
                  onClick={() => handleSelect(im.id)}
                />
              ))}
            </div>
          ) : (
            /* Table view */
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
                      {['Imóvel', 'Tipo', 'Negócio', 'Preço', 'Área', 'Bairro', 'Status', 'Leads', 'Ações'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: '0.72rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(im => {
                      const ss  = STATUS_CFG[im.status];
                      const lc  = leadsCount(im.id);
                      const sel = selected === im.id;
                      return (
                        <tr key={im.id}
                          onClick={() => handleSelect(im.id)}
                          style={{ borderBottom: '1px solid var(--line)', background: sel ? 'var(--bg)' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--bg)'; }}
                          onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 44, height: 36, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                                <img src={im.img} alt={im.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div style={{ maxWidth: 170, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{im.titulo}</div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: TIPO_COLOR[im.tipo], background: `${TIPO_COLOR[im.tipo]}18`, padding: '2px 8px', borderRadius: 99 }}>{im.tipo}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: im.transacao === 'Aluguel' ? 'var(--red)' : 'var(--text2)', fontWeight: 500, fontSize: '0.8rem' }}>{im.transacao}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                            {formatCurrencyShort(im.preco)}{im.transacao === 'Aluguel' && <span style={{ fontSize: '0.65rem', color: 'var(--text3)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/mês</span>}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text2)', fontSize: '0.8rem' }}>{im.area}m²</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text2)', fontSize: '0.8rem' }}>{im.bairro}</td>
                          <td style={{ padding: '10px 14px' }}><StatusBadge status={im.status} /></td>
                          <td style={{ padding: '10px 14px' }}>
                            {lc > 0 ? <span style={{ fontWeight: 700, color: '#3B82F6', fontSize: '0.8rem' }}>{lc} lead{lc > 1 ? 's' : ''}</span> : <span style={{ color: 'var(--text4)', fontSize: '0.8rem' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                              <button title="Ver detalhes" onClick={() => handleSelect(im.id)}
                                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--line2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                                <Eye size={13} />
                              </button>
                              <button title="Editar" onClick={() => { setSelected(im.id); setEditMode(true); }}
                                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--line2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                                <Pencil size={13} />
                              </button>
                              <button title="Excluir" onClick={() => setConfirmDel(im.id)}
                                style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--line2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right detail / edit panel ── */}
      {selectedImovel && (
        <div style={{
          width: 400, flexShrink: 0, borderLeft: '1px solid var(--line)', background: 'white',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideInRight 0.25s var(--ease) both',
        }}>
          {editMode ? (
            <EditForm
              im={selectedImovel}
              onSave={handleSave}
              onCancel={() => setEditMode(false)}
            />
          ) : (
            <DetailPanel
              im={selectedImovel}
              leads={leads}
              onEdit={() => setEditMode(true)}
              onDelete={() => setConfirmDel(selectedImovel.id)}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmDel && (
        <>
          <div className="overlay" onClick={() => setConfirmDel(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'white', borderRadius: 'var(--radius-lg)', padding: 32, zIndex: 300,
            width: 360, boxShadow: 'var(--shadow-xl)', animation: 'scaleUp 0.25s var(--ease) both',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} style={{ color: 'var(--red)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', textAlign: 'center', fontSize: '1.3rem', marginBottom: 8 }}>Excluir imóvel?</h3>
            <p style={{ color: 'var(--text2)', textAlign: 'center', fontSize: '0.88rem', marginBottom: 24 }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-red" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleDelete(confirmDel)}>Excluir</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 1100px) { .imoveis-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 700px)  { .imoveis-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
