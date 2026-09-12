import React from "react";
import {
  ArrowUpRight,
  Compass,
  HeartHandshake,
  MapPin,
  MessagesSquare,
} from "lucide-react";
import useCatalog from "../../components/useCatalog.js";
import { PropertyImage } from "../../components/ImovelCard.jsx";
import { CONTACT, goLink, whatsappLink } from "../../components/publicUtils.js";
export default function SobrePage({ navigate }) {
  const { items } = useCatalog();
  const photo =
    items.find((i) => i.cidade === "Vila Velha" && i.img) ||
    items.find((i) => i.img);
  return (
    <main className="public-site">
      <section className="public-shell public-about-intro">
        <div className="public-about-photo">
          {photo && <PropertyImage item={photo} eager />}
        </div>
        <div className="public-about-copy">
          <p className="public-kicker">Conheça a VilaVix</p>
          <h1>
            Imóveis conectam
            <br />
            lugares e histórias.
          </h1>
          <p>
            Escolher um imóvel é escolher o que estará perto de você. A rotina,
            as pessoas, o trabalho e os planos para o futuro.
          </p>
          <p>
            A VilaVix Imóveis está em Itapuã, Vila Velha. É daqui que nossa
            equipe aproxima quem procura um novo endereço de quem quer vender ou
            alugar seu imóvel.
          </p>
          <p>
            Nosso atendimento começa por entender o que você busca, para
            apresentar as opções e acompanhar cada conversa com atenção.
          </p>
          <a
            className="public-text-link"
            href={whatsappLink()}
            target="_blank"
            rel="noreferrer"
          >
            Conte seus planos para a gente <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
      <section className="public-about-values">
        <div className="public-shell">
          <h2>
            Uma relação próxima.
            <br />
            Uma escolha com mais clareza.
          </h2>
          <div className="public-value-grid">
            <article>
              <MessagesSquare size={26} />
              <h3>Primeiro, a conversa</h3>
              <p>
                Queremos saber sobre seus planos, as regiões que fazem sentido e
                o que não pode faltar no seu próximo imóvel.
              </p>
            </article>
            <article>
              <Compass size={26} />
              <h3>Opções que fazem sentido</h3>
              <p>
                Use nosso catálogo para conhecer os imóveis, salvar seus
                favoritos e preparar uma seleção para visitar.
              </p>
            </article>
            <article>
              <HeartHandshake size={26} />
              <h3>Gente acompanhando você</h3>
              <p>
                Uma equipe para conversar sobre os detalhes de cada imóvel e
                orientar os próximos passos do atendimento.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="public-shell public-advice-section">
        <div className="public-advice-heading">
          <p className="public-kicker">Nossa casa em Vila Velha</p>
          <h2>Estamos por perto.</h2>
          <p style={{ color: "#697889", fontSize: 14, marginTop: 22 }}>
            {CONTACT.address}
          </p>
          <a
            className="public-text-link"
            style={{ marginTop: 20 }}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={16} />
            Ver como chegar
          </a>
        </div>
        <div className="public-advice-list">
          <div>
            <h3>Seu próximo imóvel</h3>
            <p>
              Casas, apartamentos, terrenos e outras possibilidades. Explore os
              imóveis disponíveis na região.
            </p>
            <a href="/imoveis" onClick={(e) => goLink(e, navigate, "imoveis")}>
              Encontrar um imóvel <ArrowUpRight size={17} />
            </a>
          </div>
          <div>
            <h3>Seu imóvel no nosso catálogo</h3>
            <p>
              Converse com a equipe sobre o imóvel que você quer anunciar e
              conheça os próximos passos.
            </p>
            <a
              href="/contato?assunto=anunciar"
              onClick={(e) =>
                goLink(e, navigate, "contato", {
                  filters: { assunto: "anunciar" },
                })
              }
            >
              Falar sobre meu imóvel <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
