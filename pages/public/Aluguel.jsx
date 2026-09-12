import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  FileText,
  KeyRound,
  Megaphone,
  MessageCircle,
  WalletCards,
  Wrench,
} from "lucide-react";
import useCatalog from "../../components/useCatalog.js";
import ImovelCard, { PropertyImage } from "../../components/ImovelCard.jsx";
import {
  CONTACT,
  goLink,
  location,
  propertyHref,
  whatsappLink,
} from "../../components/publicUtils.js";
import "../../styles/aluguel.css";

const managementMessage =
  "Olá! Vim pela página de aluguel da VilaVix e quero conhecer a gestão completa do meu imóvel.";

const services = [
  [
    Megaphone,
    "Divulgação do imóvel",
    "Apresentação do imóvel e divulgação para aproximar sua oferta de quem procura um lugar para alugar.",
  ],
  [
    CalendarDays,
    "Atendimento e visitas",
    "Contato com interessados, organização de visitas e acompanhamento das propostas.",
  ],
  [
    FileText,
    "Documentação e contrato",
    "Acompanhamento da documentação e das condições da locação, com orientação em cada etapa.",
  ],
  [
    ClipboardCheck,
    "Vistorias",
    "Registro das condições do imóvel na entrada e na saída, para acompanhar sua conservação.",
  ],
  [
    WalletCards,
    "Cobranças e repasses",
    "Acompanhamento dos pagamentos e dos repasses, conforme as condições combinadas na administração.",
  ],
  [
    Wrench,
    "Manutenção e comunicação",
    "Organização das solicitações do inquilino e contato com o proprietário para alinhar os próximos passos.",
  ],
];

const questions = [
  [
    "Meu imóvel já está alugado. Posso conversar sobre a gestão?",
    "Sim. Conte para a equipe como está a locação e quais documentos você tem. Vamos avaliar a situação atual e explicar os próximos passos para a administração.",
  ],
  [
    "Como conheço os valores e as condições do serviço?",
    "A equipe prepara uma proposta a partir das características do imóvel e da administração desejada. As condições e os serviços incluídos são apresentados antes da contratação.",
  ],
  [
    "Como funcionam os reparos no imóvel?",
    "A equipe acompanha as solicitações e conversa com as partes sobre a necessidade, a responsabilidade e a autorização do serviço, conforme o contrato de administração e a locação.",
  ],
  [
    "Quero alugar um imóvel para morar. Onde encontro as opções?",
    "Os imóveis disponíveis estão logo abaixo e na busca do site. Abra o imóvel para consultar fotos, informações e conversar com a equipe sobre uma visita.",
  ],
];

function OwnerContact() {
  const [type, setType] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const message = [
    managementMessage,
    type && `Tipo do imóvel: ${type}.`,
    neighborhood.trim() && `Localização: ${neighborhood.trim()}.`,
    occupancy && `Situação: ${occupancy}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section
      className="rental-owner-section"
      id="gestao-do-meu-imovel"
      aria-labelledby="rental-owner-title"
    >
      <div className="public-shell rental-owner-layout">
        <div className="rental-owner-copy">
          <span className="rental-section-label">Para proprietários</span>
          <h2 id="rental-owner-title">
            Vamos cuidar
            <br />
            do seu imóvel?
          </h2>
          <p>
            Conte um pouco sobre ele. Nossa equipe conversa com você sobre a
            gestão, os serviços e as condições para começar.
          </p>
          <div className="rental-contact-person">
            <span className="rental-contact-icon">
              <MessageCircle size={23} aria-hidden="true" />
            </span>
            <div>
              <strong>Conversa direto com a VilaVix</strong>
              <span>Atendimento pelo WhatsApp</span>
            </div>
          </div>
        </div>
        <form
          className="rental-owner-form"
          action={`https://wa.me/${CONTACT.whatsapp}`}
          method="get"
          target="_blank"
          rel="noreferrer"
        >
          <h3>Sobre o seu imóvel</h3>
          <p>Preencha o que souber para começar a conversa.</p>
          <input type="hidden" name="text" value={message} />
          <div className="rental-form-row">
            <label htmlFor="rental-type">
              Tipo de imóvel
              <select
                id="rental-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="">Selecione</option>
                <option>Apartamento</option>
                <option>Casa</option>
                <option>Imóvel comercial</option>
                <option>Terreno</option>
                <option>Outro</option>
              </select>
            </label>
            <label htmlFor="rental-occupancy">
              Situação atual
              <select
                id="rental-occupancy"
                value={occupancy}
                onChange={(event) => setOccupancy(event.target.value)}
              >
                <option value="">Selecione</option>
                <option>Disponível para alugar</option>
                <option>Já está alugado</option>
                <option>Em preparação</option>
              </select>
            </label>
          </div>
          <label htmlFor="rental-neighborhood">
            Bairro e cidade
            <input
              id="rental-neighborhood"
              autoComplete="address-level2"
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              maxLength={160}
              placeholder="Ex.: Itapuã, Vila Velha"
            />
          </label>
          <button className="public-button public-button-wine" type="submit">
            <MessageCircle size={18} aria-hidden="true" /> Conversar sobre meu
            imóvel
          </button>
          <small>
            O WhatsApp abrirá com essas informações. Você confere e envia a
            mensagem.
          </small>
        </form>
      </div>
    </section>
  );
}

export default function AluguelPage({ navigate }) {
  const { items, loading, error } = useCatalog();
  const rentals = useMemo(
    () =>
      items.filter(
        (item) => item.finalidade === "aluguel" && item.status === "disponivel",
      ),
    [items],
  );
  const heroProperty =
    rentals.find((item) => item.img || item.fotos?.length) ||
    items.find((item) => item.img || item.fotos?.length);

  return (
    <main className="public-site rental-page">
      <section
        className="public-shell rental-hero"
        aria-labelledby="rental-title"
      >
        <div className="rental-hero-copy">
          <span className="rental-section-label">
            <KeyRound size={17} aria-hidden="true" /> Aluguel e gestão de
            imóveis
          </span>
          <h1 id="rental-title">
            Seu imóvel alugado.
            <br />A gestão com
            <br />a VilaVix.
          </h1>
          <p>
            Alugar é só o começo. Nossa especialidade é a gestão completa: da
            divulgação ao cuidado com a rotina da locação, com uma equipe por
            perto.
          </p>
          <a
            className="public-button public-button-wine"
            href={whatsappLink(managementMessage)}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" /> Quero a gestão do meu
            imóvel
          </a>
          <a
            className="rental-tenant-link"
            href="/imoveis?finalidade=aluguel"
            onClick={(event) =>
              goLink(event, navigate, "imoveis", {
                filters: { finalidade: "aluguel" },
              })
            }
          >
            Procuro um imóvel para alugar
          </a>
        </div>
        <div className="rental-hero-visual">
          {heroProperty ? (
            <PropertyImage item={heroProperty} eager />
          ) : (
            <div className="rental-hero-placeholder">
              <KeyRound size={60} aria-hidden="true" />
              <p>
                Seu imóvel.
                <br />
                Nossa atenção.
              </p>
            </div>
          )}
          <div className="rental-hero-caption">
            <span>Imóvel do catálogo VilaVix</span>
            {heroProperty && (
              <a
                href={propertyHref(heroProperty)}
                onClick={(event) =>
                  goLink(event, navigate, "imovel-detail", {
                    imovelId: heroProperty.slug || heroProperty.id,
                  })
                }
              >
                {location(heroProperty)}
              </a>
            )}
          </div>
        </div>
      </section>

      <section
        className="public-shell rental-management"
        aria-labelledby="rental-management-title"
      >
        <div className="rental-section-intro">
          <h2 id="rental-management-title">
            Gestão completa,
            <br />
            no dia a dia.
          </h2>
          <p>
            O proprietário tem com quem falar. O inquilino sabe a quem recorrer.
            A VilaVix acompanha o imóvel e organiza as etapas da locação.
          </p>
        </div>
        <div className="rental-services">
          {services.map(([Icon, title, description]) => (
            <article className="rental-service" key={title}>
              <span className="rental-service-icon">
                <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="rental-lifecycle">
          <div className="rental-lifecycle-heading">
            <KeyRound size={25} aria-hidden="true" />
            <h3>
              Uma equipe.
              <br />
              Toda a locação.
            </h3>
          </div>
          <div className="rental-lifecycle-stage">
            <span>Antes de alugar</span>
            <p>
              Apresentar o imóvel, atender interessados e acompanhar a
              contratação.
            </p>
          </div>
          <div className="rental-lifecycle-stage">
            <span>Durante o contrato</span>
            <p>
              Acompanhar pagamentos, solicitações e a comunicação entre as
              partes.
            </p>
          </div>
          <div className="rental-lifecycle-stage">
            <span>Na entrega das chaves</span>
            <p>Organizar a vistoria de saída e os próximos passos do imóvel.</p>
          </div>
        </div>
      </section>

      <OwnerContact />

      <section
        className="public-shell rental-listings"
        aria-labelledby="rental-listings-title"
      >
        <div className="rental-section-intro">
          <div>
            <span className="rental-section-label">
              Para quem procura alugar
            </span>
            <h2 id="rental-listings-title">Seu próximo endereço.</h2>
          </div>
          <div>
            <p>
              Conheça os imóveis disponíveis, confira os detalhes e fale com a
              equipe para organizar sua visita.
            </p>
            <a
              className="rental-catalog-link"
              href="/imoveis?finalidade=aluguel"
              onClick={(event) =>
                goLink(event, navigate, "imoveis", {
                  filters: { finalidade: "aluguel" },
                })
              }
            >
              Abrir busca de aluguéis
            </a>
          </div>
        </div>
        {error && (
          <p className="rental-catalog-notice" role="status">
            A atualização do catálogo está indisponível. Exibimos as últimas
            opções recebidas; confirme a disponibilidade com a equipe.
          </p>
        )}
        {loading ? (
          <p role="status" className="rental-catalog-notice">
            Carregando imóveis para aluguel…
          </p>
        ) : rentals.length ? (
          <div
            className={`rental-listings-grid${rentals.length === 1 ? " is-single" : ""}`}
          >
            {rentals.slice(0, 3).map((item) => (
              <ImovelCard key={item.id} item={item} navigate={navigate} />
            ))}
            {rentals.length === 1 && (
              <aside className="rental-search-help">
                <div className="rental-search-help-heading">
                  <KeyRound size={26} aria-hidden="true" />
                  <h3>
                    O que não pode faltar
                    <br />
                    no seu próximo imóvel?
                  </h3>
                </div>
                <p>
                  Conte o bairro, o número de quartos e o valor que você
                  procura. Nossa equipe ajuda a conferir as opções do catálogo.
                </p>
                <ul>
                  <li>
                    <Check size={17} aria-hidden="true" /> Escolha a região que
                    combina com sua rotina
                  </li>
                  <li>
                    <Check size={17} aria-hidden="true" /> Tire dúvidas sobre o
                    imóvel e a locação
                  </li>
                  <li>
                    <Check size={17} aria-hidden="true" /> Combine uma visita
                    com a equipe
                  </li>
                </ul>
                <a
                  className="public-button public-button-outline"
                  href={whatsappLink(
                    "Olá! Procuro um imóvel para alugar e gostaria de conversar sobre as opções da VilaVix.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar sobre o que procuro
                </a>
              </aside>
            )}
          </div>
        ) : (
          <div className="rental-no-listings">
            <h3>Vamos encontrar as opções para você.</h3>
            <p>
              Não há imóveis para aluguel disponíveis no catálogo neste momento.
              Fale com a equipe e conte o que procura.
            </p>
            <a
              className="public-button public-button-outline"
              href={whatsappLink(
                "Olá! Quero saber sobre os imóveis para alugar da VilaVix.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Consultar a equipe
            </a>
          </div>
        )}
      </section>

      <section
        className="public-shell rental-faq"
        aria-labelledby="rental-faq-title"
      >
        <h2 id="rental-faq-title">Dúvidas sobre a gestão?</h2>
        <div className="rental-faq-list">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
