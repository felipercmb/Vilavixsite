import React from 'react';
import { Calendar, Clock, User, Building2, UserCheck } from 'lucide-react';
import { visitas } from '../../data/visitas.js';
import { formatDate } from '../../utils/helpers.js';

const STATUS_STYLE = {
  confirmada: { bg: 'rgba(16,185,129,0.12)', color: '#059669', label: 'Confirmada' },
  pendente:   { bg: 'rgba(245,158,11,0.12)', color: '#B45309', label: 'Pendente'   },
};

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function Visitas() {
  const sorted = [...visitas].sort((a, b) => parseDate(a.data) - parseDate(b.data));

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.4rem' }}>Agenda de Visitas</h2>
        <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>{visitas.length} visitas agendadas neste período</p>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>
            ✓ {visitas.filter(v => v.status === 'confirmada').length} confirmadas
          </span>
        </div>
        <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span style={{ color: '#B45309', fontWeight: 600, fontSize: '0.85rem' }}>
            ⏳ {visitas.filter(v => v.status === 'pendente').length} pendentes
          </span>
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {sorted.map((v) => {
          const d    = parseDate(v.data);
          const ss   = STATUS_STYLE[v.status];
          const dayN = DAYS[d.getDay()];
          const dayD = d.getDate();
          const mon  = MONTHS[d.getMonth()];

          return (
            <div
              key={v.id}
              className="card"
              style={{ padding: 0, overflow: 'hidden', transition: 'all 0.3s ease' }}
            >
              {/* Color stripe */}
              <div style={{ height: 4, background: v.status === 'confirmada' ? '#10B981' : '#F59E0B' }} />

              <div style={{ padding: 24 }}>
                {/* Date block + status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {/* Calendar block */}
                    <div
                      style={{
                        width: 56, height: 60,
                        borderRadius: 12,
                        background: 'var(--navy)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(21,32,54,0.20)',
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em' }}>{mon}</span>
                      <span style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.1 }}>{dayD}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem' }}>{dayN}</span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: '0.82rem', marginBottom: 4 }}>
                        <Clock size={13} />
                        {v.hora}h
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>
                        {v.imovel}
                      </div>
                    </div>
                  </div>

                  <span style={{ padding: '4px 10px', borderRadius: 8, background: ss.bg, color: ss.color, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {ss.label}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                  {[
                    { Icon: User,      label: 'Cliente',   val: v.cliente   },
                    { Icon: UserCheck, label: 'Corretor',  val: v.corretor  },
                  ].map(({ Icon, label, val }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} style={{ color: 'var(--text3)' }} />
                      </div>
                      <div>
                        <span style={{ color: 'var(--text3)', fontSize: '0.72rem' }}>{label}: </span>
                        <span style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 500 }}>{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
