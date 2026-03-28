import React, { useState, useMemo } from 'react';
import { LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import ImovelCard from '../../components/ImovelCard.jsx';
import { imoveis } from '../../data/imoveis.js';

const TIPOS    = ['Todos', 'Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Comercial'];
const TRANSACS = ['Todos', 'Venda', 'Aluguel'];

export default function ImoveisPage({ navigate }) {
  const [tipo, setTipo]         = useState('Todos');
  const [trans, setTrans]       = useState('Todos');
  const [view, setView]         = useState('grid');
  const [busca, setBusca]       = useState('');

  const filtered = useMemo(() => {
    return imoveis.filter((im) => {
      if (tipo  !== 'Todos' && im.tipo      !== tipo)  return false;
      if (trans !== 'Todos' && im.transacao !== trans) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const hay = `${im.titulo} ${im.bairro} ${im.cidade} ${im.tipo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tipo, trans, busca]);

  const hasFilters = tipo !== 'Todos' || trans !== 'Todos' || busca;

  const clearFilters = () => { setTipo('Todos'); setTrans('Todos'); setBusca(''); };

  return (
    <main style={{ paddingTop: 'var(--header-h)', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ background: 'var(--navy)', padding: '48px 0 40px' }}>
        <div className="container">
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Nossos Imóveis
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}>
            Encontre seu <em style={{ fontWeight: 600 }}>imóvel ideal</em>
          </h1>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--line)', position: 'sticky', top: 'var(--header-h)', zIndex: 50 }}>
        <div className="container" style={{ padding: '16px 32px' }}>
          {/* Busca */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <input
              className="input"
              placeholder="Buscar por bairro, tipo ou título..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ maxWidth: 340, paddingRight: busca ? 36 : 16 }}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="btn btn-outline btn-sm"
                style={{ gap: 6 }}
              >
                <X size={14} />
                Limpar filtros
              </button>
            )}

            {/* View toggle */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--bg2)', borderRadius: 10, padding: 4 }}>
              {[
                { icon: LayoutGrid, v: 'grid' },
                { icon: List, v: 'list' },
              ].map(({ icon: Icon, v }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: view === v ? 'white' : 'transparent',
                    color: view === v ? 'var(--navy)' : 'var(--text3)',
                    boxShadow: view === v ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text3)', marginRight: 4 }}>Tipo:</span>
            {TIPOS.map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`pill${tipo === t ? ' active' : ''}`}
              >
                {t}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: 'var(--line2)', margin: '0 4px' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text3)', marginRight: 4 }}>Negócio:</span>
            {TRANSACS.map((t) => (
              <button
                key={t}
                onClick={() => setTrans(t)}
                className={`pill${trans === t ? ' active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container" style={{ padding: '32px 32px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
            <strong style={{ color: 'var(--navy)' }}>{filtered.length}</strong>{' '}
            imóve{filtered.length !== 1 ? 'is' : 'l'} encontrado{filtered.length !== 1 ? 's' : ''}
            {tipo  !== 'Todos' && <> · <span style={{ color: 'var(--red)' }}>{tipo}</span></>}
            {trans !== 'Todos' && <> · <span style={{ color: 'var(--red)' }}>{trans}</span></>}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏠</div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 12 }}>Nenhum imóvel encontrado</h3>
            <p style={{ color: 'var(--text3)', marginBottom: 24 }}>Tente ajustar os filtros de busca.</p>
            <button className="btn btn-primary" onClick={clearFilters}>Limpar filtros</button>
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {filtered.map((im) => (
              <ImovelCard key={im.id} imovel={im} view="grid" navigate={navigate} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map((im) => (
              <ImovelCard key={im.id} imovel={im} view="list" navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
