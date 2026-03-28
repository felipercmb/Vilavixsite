import React, { useState, useRef } from 'react';
import { Upload, X, Image, CheckCircle, Save } from 'lucide-react';

const TIPOS     = ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Comercial'];
const TRANSACS  = ['Venda', 'Aluguel'];
const STATUS_OPT = ['ativo', 'reservado'];

const EMPTY = {
  titulo: '', tipo: 'Apartamento', transacao: 'Venda', preco: '',
  quartos: '', banheiros: '', vagas: '', area: '',
  bairro: '', cidade: 'Vitória', endereco: '', andar: '',
  condominio: '', iptu: '', ano: '', descricao: '',
  status: 'ativo',
};

export default function AddImovel({ setMenu }) {
  const [form, setForm]         = useState(EMPTY);
  const [photos, setPhotos]     = useState([]);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved]       = useState(null); // 'rascunho' | 'publicado'
  const fileRef = useRef();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addPhotos = (files) => {
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setPhotos((p) => [...p, ...urls]);
  };

  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    addPhotos(e.dataTransfer.files);
  };

  const handleSubmit = (mode) => {
    setSaved(mode);
    setTimeout(() => { setSaved(null); setMenu('imoveis'); }, 2000);
  };

  if (saved) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', animation: 'scaleUp 0.4s var(--ease) both' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: saved === 'publicado' ? 'rgba(16,185,129,0.12)' : 'rgba(21,32,54,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={40} style={{ color: saved === 'publicado' ? 'var(--green)' : 'var(--navy)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.6rem', marginBottom: 8 }}>
            {saved === 'publicado' ? 'Imóvel publicado!' : 'Rascunho salvo!'}
          </h2>
          <p style={{ color: 'var(--text3)' }}>Redirecionando para a lista de imóveis...</p>
        </div>
      </div>
    );
  }

  const Field = ({ label, children, required: req }) => (
    <div>
      <label className="label">{label}{req && <span style={{ color: 'var(--red)' }}> *</span>}</label>
      {children}
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.4rem' }}>Cadastrar Imóvel</h2>
        <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: 2 }}>Preencha todos os campos para publicar o imóvel</p>
      </div>

      {/* Section: Informações básicas */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 20, fontSize: '1.1rem', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          Informações básicas
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Título do imóvel" required>
            <input className="input" placeholder="Ex: Cobertura Duplex com Vista Mar" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Field label="Tipo" required>
              <select className="select" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Transação" required>
              <select className="select" value={form.transacao} onChange={(e) => set('transacao', e.target.value)}>
                {TRANSACS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS_OPT.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label={`Preço ${form.transacao === 'Aluguel' ? '(R$/mês)' : '(R$)'}`} required>
              <input className="input" type="number" placeholder="0" value={form.preco} onChange={(e) => set('preco', e.target.value)} min="0" />
            </Field>
            <Field label="Ano de construção">
              <input className="input" type="number" placeholder="Ex: 2020" value={form.ano} onChange={(e) => set('ano', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Section: Características */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 20, fontSize: '1.1rem', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          Características
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }} className="specs-grid">
          {[
            { label: 'Quartos',   key: 'quartos',   ph: '0' },
            { label: 'Banheiros', key: 'banheiros', ph: '0' },
            { label: 'Vagas',     key: 'vagas',     ph: '0' },
            { label: 'Área (m²)', key: 'area',      ph: '0' },
          ].map(({ label, key, ph }) => (
            <Field key={key} label={label}>
              <input className="input" type="number" placeholder={ph} value={form[key]} onChange={(e) => set(key, e.target.value)} min="0" />
            </Field>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Field label="Andar">
            <input className="input" placeholder="Ex: 8º andar" value={form.andar} onChange={(e) => set('andar', e.target.value)} />
          </Field>
          <Field label="Condomínio (R$/mês)">
            <input className="input" type="number" placeholder="0" value={form.condominio} onChange={(e) => set('condominio', e.target.value)} min="0" />
          </Field>
          <Field label="IPTU (R$/ano)">
            <input className="input" type="number" placeholder="0" value={form.iptu} onChange={(e) => set('iptu', e.target.value)} min="0" />
          </Field>
        </div>
      </div>

      {/* Section: Localização */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 20, fontSize: '1.1rem', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          Localização
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Endereço completo" required>
            <input className="input" placeholder="Av. Vitória, 1200 — Praia do Canto, Vitória - ES" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Bairro" required>
              <input className="input" placeholder="Ex: Praia do Canto" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
            </Field>
            <Field label="Cidade" required>
              <input className="input" placeholder="Ex: Vitória" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Section: Descrição */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 20, fontSize: '1.1rem', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          Descrição
        </h3>
        <Field label="Descrição detalhada" required>
          <textarea
            className="textarea"
            placeholder="Descreva o imóvel, seus diferenciais, localização, acabamento e demais informações relevantes..."
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            style={{ minHeight: 140 }}
          />
        </Field>
        <p style={{ color: 'var(--text3)', fontSize: '0.75rem', marginTop: 8 }}>{form.descricao.length} / 1000 caracteres recomendados</p>
      </div>

      {/* Section: Fotos */}
      <div className="card" style={{ padding: 28, marginBottom: 32 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 8, fontSize: '1.1rem' }}>Fotos</h3>
        <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginBottom: 20 }}>Adicione até 10 fotos. A primeira será a foto principal.</p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--navy)' : 'var(--line2)'}`,
            borderRadius: 'var(--radius)',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--navy-light)' : 'var(--bg)',
            transition: 'all 0.2s ease',
            marginBottom: photos.length > 0 ? 20 : 0,
          }}
        >
          <Upload size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
            Arraste as fotos aqui ou clique para selecionar
          </p>
          <p style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>JPG, PNG, WEBP · Máximo 10 MB por arquivo</p>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => addPhotos(e.target.files)} />
        </div>

        {/* Photo preview grid */}
        {photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {photos.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 90 }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === 0 && (
                  <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--red)', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                    PRINCIPAL
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <button
          className="btn btn-outline btn-lg"
          onClick={() => handleSubmit('rascunho')}
          style={{ gap: 10 }}
        >
          <Save size={18} />
          Salvar rascunho
        </button>
        <button
          className="btn btn-red btn-lg"
          onClick={() => handleSubmit('publicado')}
          style={{ gap: 10 }}
          disabled={!form.titulo || !form.preco || !form.bairro}
        >
          <CheckCircle size={18} />
          Publicar imóvel
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .specs-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
