import React, { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin, Search } from "lucide-react";
import useCatalog from "../../components/useCatalog.js";
import ImovelCard, { PropertyImage } from "../../components/ImovelCard.jsx";
import { getCatalogFacets } from "../../lib/catalog.js";
import {
  goLink,
  location,
  propertyHref,
  whatsappLink,
} from "../../components/publicUtils.js";
export default function HomePage({ navigate }) {
  const { items, loading } = useCatalog();
  const [purpose, setPurpose] = useState("venda");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const facets = useMemo(() => getCatalogFacets(items), [items]);
  const featured = useMemo(
    () =>
      [...items]
        .sort((a, b) => Number(b.destaque) - Number(a.destaque))
        .slice(0, 6),
    [items],
  );
  const hero = featured.find((i) => i.img) || items.find((i) => i.img);
  const cities = useMemo(
    () =>
      facets.cidades
        .map((cidade) => ({
          cidade,
          items: items.filter((i) => i.cidade === cidade),
        }))
        .sort((a, b) => b.items.length - a.items.length)
        .slice(0, 4),
    [items, facets],
  );
  return (
    <main className="public-site public-home">
      <section className="public-hero">
        <div className="public-hero-photo">
          {hero && <PropertyImage item={hero} eager />}
        </div>
        <div className="public-shell public-hero-content">
          <p className="public-hero-location">
            <MapPin size={16} /> Vila Velha, Vitória e região
          </p>
          <h1>
            Seu lugar na
            <br />
            Grande Vitória.
          </h1>
          <p>
            Para morar, investir ou começar uma nova história.
            <br className="public-desktop-break" /> Encontre o imóvel que
            combina com o seu momento.
          </p>
          <a
            className="public-hero-link"
            href="/imoveis"
            onClick={(e) => goLink(e, navigate, "imoveis")}
          >
            Explore nossos imóveis <ArrowRight size={18} />
          </a>
        </div>
        {hero && (
          <a
            className="public-hero-caption"
            href={propertyHref(hero)}
            onClick={(e) =>
              goLink(e, navigate, "imovel-detail", {
                imovelId: hero.slug || hero.id,
              })
            }
          >
            <span>
              Conheça este imóvel<strong>{location(hero)}</strong>
            </span>
            <ArrowUpRight size={23} />
          </a>
        )}
      </section>
      <div className="public-shell public-search-container">
        <form
          className="public-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("imoveis", {
              filters: {
                finalidade: purpose,
                cidade: city,
                tipo: type,
                q: query,
              },
            });
          }}
        >
          <div className="public-search-tabs" aria-label="Finalidade">
            <button
              type="button"
              className={purpose === "venda" ? "is-active" : ""}
              onClick={() => setPurpose("venda")}
              aria-pressed={purpose === "venda"}
            >
              Quero comprar
            </button>
            <button
              type="button"
              className={purpose === "aluguel" ? "is-active" : ""}
              onClick={() => setPurpose("aluguel")}
              aria-pressed={purpose === "aluguel"}
            >
              Quero alugar
            </button>
          </div>
          <div className="public-search-fields">
            <label>
              Onde você quer morar?
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Todas as cidades</option>
                {facets.cidades.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo de imóvel
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Todos os tipos</option>
                {facets.tipos.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Bairro ou código
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="O que você procura?"
              />
            </label>
            <button className="public-button public-button-wine" type="submit">
              <Search size={19} /> Buscar imóveis
            </button>
          </div>
        </form>
      </div>
      <section className="public-section public-shell">
        <div className="public-section-heading">
          <div>
            <p className="public-kicker">Escolhas para o seu próximo passo</p>
            <h2>Encontre o seu novo endereço.</h2>
          </div>
          <a
            className="public-text-link"
            href="/imoveis"
            onClick={(e) => goLink(e, navigate, "imoveis")}
          >
            Ver todos os imóveis <ArrowUpRight size={19} />
          </a>
        </div>
        {loading ? (
          <div className="public-loading" role="status">
            Carregando imóveis…
          </div>
        ) : featured.length ? (
          <div className="public-property-grid">
            {featured.map((item) => (
              <ImovelCard key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        ) : (
          <div className="public-empty">
            <h3>Vamos encontrar seu imóvel.</h3>
            <p>
              Converse com nossa equipe para conhecer as opções disponíveis.
            </p>
            <a className="public-button" href={whatsappLink()}>
              Falar com a VilaVix
            </a>
          </div>
        )}
      </section>
      {cities.length > 0 && (
        <section className="public-cities-section">
          <div className="public-shell">
            <div className="public-section-heading">
              <div>
                <p className="public-kicker">
                  Perto do que faz parte da sua vida
                </p>
                <h2>Qual é o seu lugar?</h2>
              </div>
              <p>
                Explore os imóveis por cidade
                <br />e descubra novas possibilidades.
              </p>
            </div>
            <div className="public-cities-grid">
              {cities.map(({ cidade, items: cityItems }) => (
                <a
                  key={cidade}
                  className="public-city-card"
                  href={`/imoveis?cidade=${encodeURIComponent(cidade)}`}
                  onClick={(e) =>
                    goLink(e, navigate, "imoveis", { filters: { cidade } })
                  }
                >
                  <PropertyImage
                    item={cityItems.find((i) => i.img) || cityItems[0]}
                  />
                  <span>
                    <strong>{cidade}</strong>
                    <small>
                      {cityItems.length}{" "}
                      {cityItems.length === 1 ? "imóvel" : "imóveis"}
                    </small>
                  </span>
                  <ArrowUpRight size={24} />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="public-shell public-rental-feature">
        <div className="public-rental-feature-inner">
          <div>
            <p className="public-kicker">Para quem tem um imóvel para alugar</p>
            <h2>
              Gestão completa.
              <br />
              Do anúncio à rotina do aluguel.
            </h2>
          </div>
          <div>
            <p>
              Encontrar o inquilino é só o começo. A VilaVix acompanha a locação
              com divulgação, visitas, contrato, vistorias, cobranças e
              manutenção, mantendo você por dentro de cada etapa.
            </p>
            <a
              className="public-button public-button-white"
              href="/aluguel"
              onClick={(e) => goLink(e, navigate, "aluguel")}
            >
              Conheça nossa gestão de aluguel <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>
      <section className="public-shell public-advice-section">
        <div className="public-advice-heading">
          <p className="public-kicker">VilaVix Imóveis</p>
          <h2>
            Uma boa escolha
            <br />
            começa com proximidade.
          </h2>
          <a
            className="public-text-link"
            href="/sobre"
            onClick={(e) => goLink(e, navigate, "sobre")}
          >
            Conheça a VilaVix <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="public-advice-list">
          <div>
            <h3>Encontre com a gente</h3>
            <p>
              Conte o que é importante para você. Nossa equipe ajuda a
              selecionar as opções e organizar as visitas.
            </p>
            <a
              href={whatsappLink(
                "Olá! Gostaria de ajuda para encontrar um imóvel.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Falar com um corretor <ArrowUpRight size={17} />
            </a>
          </div>
          <div>
            <h3>Seu imóvel, novos caminhos</h3>
            <p>
              Quer vender ou alugar? Apresente seu imóvel e converse sobre os
              próximos passos para anunciá-lo com a VilaVix.
            </p>
            <a
              href="/contato?assunto=anunciar"
              onClick={(e) =>
                goLink(e, navigate, "contato", {
                  filters: { assunto: "anunciar" },
                })
              }
            >
              Quero anunciar meu imóvel <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>
      <section className="public-home-contact">
        <div className="public-shell">
          <h2>
            Vamos encontrar
            <br />o seu próximo endereço?
          </h2>
          <a
            className="public-button public-button-white"
            href={whatsappLink()}
            target="_blank"
            rel="noreferrer"
          >
            Converse com a VilaVix <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
    </main>
  );
}
