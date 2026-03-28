import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageCircle, CheckCircle, Send } from 'lucide-react';
import { wppLink, WPP_NUMBER } from '../../utils/helpers.js';

const ASSUNTOS = ['Comprar um imóvel', 'Alugar um imóvel', 'Vender/anunciar meu imóvel', 'Investimento imobiliário', 'Outra dúvida'];

export default function ContatoPage({ navigate }) {
  const [form, setForm]     = useState({ nome: '', email: '', telefone: '', assunto: '', mensagem: '' });
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  return (
    <main style={{ paddingTop: 'var(--header-h)' }}>
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '64px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -40, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,40,40,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="container">
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Fale conosco</p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}>
            Estamos prontos para<br /><em style={{ fontWeight: 600 }}>te atender</em>
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={{ padding: '80px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'start' }} className="contato-grid">
          {/* Info column */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.6rem', marginBottom: 8 }}>
              Informações de contato
            </h2>
            <p style={{ color: 'var(--text2)', marginBottom: 36, lineHeight: 1.6 }}>
              Nossa equipe está disponível para esclarecer suas dúvidas e ajudá-lo a encontrar o imóvel ideal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
              {[
                {
                  Icon: MapPin,
                  title: 'Endereço',
                  lines: ['Av. Vitória, 1200 — Praia do Canto', 'Vitória - ES, CEP 29055-280'],
                },
                {
                  Icon: Phone,
                  title: 'Telefone',
                  lines: ['(27) 3344-9900', '(27) 99887-7766'],
                },
                {
                  Icon: Mail,
                  title: 'E-mail',
                  lines: ['contato@vilavix.com.br', 'vendas@vilavix.com.br'],
                },
                {
                  Icon: Clock,
                  title: 'Horário de funcionamento',
                  lines: ['Seg–Sex: 08h às 18h', 'Sábado: 09h às 13h'],
                },
              ].map(({ Icon, title, lines }, i) => (
                <div key={i} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: 'var(--red)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--navy)', marginBottom: 4 }}>{title}</div>
                    {lines.map((l, li) => (
                      <div key={li} style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.5 }}>{l}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <div style={{ background: 'var(--navy)', borderRadius: 'var(--radius)', padding: 28 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', marginTop: 5, animation: 'glow 2s ease-in-out infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', fontWeight: 600 }}>Online agora</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.2rem', marginBottom: 8 }}>
                Prefere o WhatsApp?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.6 }}>
                Resposta em minutos. Converse com um corretor agora mesmo.
              </p>
              <a
                href={wppLink(WPP_NUMBER, 'Olá! Vim pelo site da VilaVix e gostaria de mais informações.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-wpp"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <MessageCircle size={18} />
                Iniciar conversa
              </a>
            </div>
          </div>

          {/* Form column */}
          <div className="card" style={{ padding: 40 }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={36} style={{ color: 'var(--green)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.5rem', marginBottom: 12 }}>Mensagem enviada!</h3>
                <p style={{ color: 'var(--text2)', lineHeight: 1.6, marginBottom: 28 }}>
                  Obrigado pelo contato! Nossa equipe retornará em até 2 horas úteis.
                </p>
                <button className="btn btn-outline" onClick={() => setSent(false)}>
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', fontSize: '1.5rem', marginBottom: 8 }}>
                  Envie sua mensagem
                </h2>
                <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: 28 }}>
                  Preencha o formulário e entraremos em contato em breve.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="label">Nome *</label>
                      <input className="input" placeholder="Seu nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                    </div>
                    <div>
                      <label className="label">Telefone</label>
                      <input className="input" placeholder="(27) 99999-9999" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="label">E-mail *</label>
                    <input className="input" type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>

                  <div>
                    <label className="label">Assunto</label>
                    <select className="select" value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })}>
                      <option value="">Selecione um assunto</option>
                      {ASSUNTOS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="label">Mensagem *</label>
                    <textarea className="textarea" placeholder="Descreva como podemos ajudá-lo..." value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} required style={{ minHeight: 140 }} />
                  </div>

                  <button type="submit" className="btn btn-red btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                    {loading ? (
                      <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    ) : (
                      <><Send size={17} /> Enviar mensagem</>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .contato-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
