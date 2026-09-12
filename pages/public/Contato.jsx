import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { CONTACT, goLink, whatsappLink } from "../../components/publicUtils.js";
export default function ContatoPage({ navigate, filters = {} }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(
    filters.assunto === "anunciar"
      ? "Anunciar meu imóvel"
      : filters.assunto === "privacidade"
        ? "Privacidade e meus dados"
        : "Encontrar um imóvel",
  );
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [prepared, setPrepared] = useState(false);
  useEffect(() => {
    if (filters.assunto === "anunciar") setSubject("Anunciar meu imóvel");
    if (filters.assunto === "privacidade")
      setSubject("Privacidade e meus dados");
  }, [filters.assunto]);
  const body = `Olá, VilaVix! Meu nome é ${name.trim()}.\nAssunto: ${subject}.${phone.trim() ? `\nTelefone para contato: ${phone.trim()}.` : ""}${message.trim() ? `\n\n${message.trim()}` : ""}`;
  const submit = (e) => {
    e.preventDefault();
    setPrepared(true);
    window.open(whatsappLink(body), "_blank", "noopener,noreferrer");
  };
  return (
    <main className="public-site">
      <section className="public-page-heading">
        <div className="public-shell">
          <nav className="public-breadcrumbs" aria-label="Caminho de navegação">
            <a href="/" onClick={(e) => goLink(e, navigate, "home")}>
              Início
            </a>
            <ChevronRight size={12} />
            <span>Contato</span>
          </nav>
          <h1>Seu próximo passo começa aqui.</h1>
          <p>
            Conte o que você procura. A gente continua essa conversa com você.
          </p>
        </div>
      </section>
      <section className="public-shell public-contact-layout">
        <div className="public-contact-copy">
          <p className="public-kicker">Fale com a VilaVix</p>
          <h2>
            Vamos conversar
            <br />
            sobre seus planos.
          </h2>
          <p>
            Quer encontrar um imóvel, anunciar o seu ou tirar uma dúvida?
            Escolha o melhor canal para falar com nossa equipe.
          </p>
          <div className="public-contact-method">
            <MessageCircle size={21} />
            <div>
              <h3>WhatsApp</h3>
              <a href={whatsappLink()} target="_blank" rel="noreferrer">
                {CONTACT.phone}{" "}
                <ArrowUpRight size={13} style={{ display: "inline" }} />
              </a>
            </div>
          </div>
          <div className="public-contact-method">
            <Mail size={21} />
            <div>
              <h3>E-mail</h3>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </div>
          </div>
          <div className="public-contact-method">
            <MapPin size={21} />
            <div>
              <h3>Venha nos conhecer</h3>
              <p>{CONTACT.address}</p>
              <a
                className="public-contact-map"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                Como chegar <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </div>
        <form className="public-contact-form" onSubmit={submit}>
          <h2>Como podemos ajudar?</h2>
          <p>Preencha sua mensagem e continue o atendimento no WhatsApp.</p>
          <div className="public-field-row">
            <label className="public-field">
              Seu nome
              <input
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setPrepared(false);
                }}
                placeholder="Como podemos chamar você?"
              />
            </label>
            <label className="public-field">
              Telefone <span style={{ fontWeight: 400 }}>(opcional)</span>
              <input
                type="tel"
                autoComplete="tel"
                maxLength={25}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(27) 99999-9999"
              />
            </label>
          </div>
          <label className="public-field">
            Quero conversar sobre
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {[
                "Encontrar um imóvel",
                "Comprar um imóvel",
                "Alugar um imóvel",
                "Anunciar meu imóvel",
                "Privacidade e meus dados",
                "Outro assunto",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="public-field">
            Sua mensagem
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Conte quais regiões você considera, o tipo de imóvel ou a sua dúvida."
            />
          </label>
          <label className="public-form-consent">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Autorizo o uso dos dados informados para responder a este contato.{" "}
              <a
                href="#public-privacy"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("public-privacy")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{ textDecoration: "underline" }}
              >
                Entenda o uso dos dados.
              </a>
            </span>
          </label>
          <button
            type="submit"
            className="public-button public-button-wine public-button-full"
          >
            <MessageCircle size={18} />
            Continuar no WhatsApp
          </button>
          {prepared ? (
            <p className="public-form-info" role="status">
              Sua mensagem está preparada. Confirme o envio no WhatsApp. Se a
              conversa não abriu,{" "}
              <a
                href={whatsappLink(body)}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "underline" }}
              >
                abra por este link
              </a>
              .
            </p>
          ) : (
            <p className="public-form-info">
              Você poderá revisar a mensagem antes de enviá-la no WhatsApp.
            </p>
          )}
        </form>
      </section>
      <section className="public-privacy-panel" id="public-privacy">
        <div className="public-shell">
          <h2>Privacidade e seus dados</h2>
          <p>
            Este formulário prepara uma mensagem para o WhatsApp. Os dados
            digitados são encaminhados quando você confirma o envio por lá e são
            usados pela equipe VilaVix para atender à sua solicitação. Os
            favoritos ficam salvos neste navegador; você pode removê-los pelo
            ícone de coração. Para esclarecer o uso das suas informações ou
            solicitar a exclusão de dados de atendimento, fale com{" "}
            <a
              href={`mailto:${CONTACT.email}?subject=Privacidade%20e%20meus%20dados`}
            >
              {CONTACT.email}
            </a>
            . O WhatsApp e o Google Maps, quando acessados, seguem suas próprias
            políticas de privacidade.
          </p>
        </div>
      </section>
    </main>
  );
}
