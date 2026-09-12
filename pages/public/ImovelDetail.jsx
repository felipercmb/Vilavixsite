import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import useCatalog, { useFavorites } from "../../components/useCatalog.js";
import ImovelCard, {
  PropertyFacts,
  PropertyImage,
} from "../../components/ImovelCard.jsx";
import {
  CONTACT,
  goLink,
  location,
  money,
  propertyHref,
  whatsappLink,
} from "../../components/publicUtils.js";
function GalleryDialog({ item, photos, initial, onClose }) {
  const [index, setIndex] = useState(initial);
  const dialog = useRef(null);
  const close = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const handle = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === "Tab") {
        const focusable = [
          ...dialog.current.querySelectorAll("button:not([disabled])"),
        ];
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handle);
      old?.focus?.();
    };
  }, [onClose, photos.length]);
  return (
    <div
      ref={dialog}
      className="public-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${item.titulo}`}
    >
      <div className="public-lightbox-top">
        <span>{item.titulo}</span>
        <button ref={close} onClick={onClose} aria-label="Fechar galeria">
          <X size={22} />
        </button>
      </div>
      <div className="public-lightbox-stage">
        <button
          onClick={() => setIndex((index - 1 + photos.length) % photos.length)}
          aria-label="Foto anterior"
          disabled={photos.length === 1}
        >
          <ChevronLeft size={24} />
        </button>
        <PropertyImage
          key={photos[index]}
          item={item}
          src={photos[index]}
          index={index}
          eager
        />
        <button
          onClick={() => setIndex((index + 1) % photos.length)}
          aria-label="Próxima foto"
          disabled={photos.length === 1}
        >
          <ChevronRight size={24} />
        </button>
      </div>
      <p className="public-lightbox-bottom" aria-live="polite">
        Foto {index + 1} de {photos.length}
      </p>
    </div>
  );
}
export default function ImovelDetailPage({ navigate, imovelId }) {
  const { items, loading } = useCatalog();
  const { favorites, toggle } = useFavorites();
  const [gallery, setGallery] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const item = useMemo(
    () =>
      items.find((i) =>
        [String(i.id), i.slug, String(i.codigo)].includes(String(imovelId)),
      ),
    [items, imovelId],
  );
  const photos = useMemo(
    () => [...new Set([...(item?.fotos || []), item?.img].filter(Boolean))],
    [item],
  );
  const similar = useMemo(
    () =>
      item
        ? items
            .filter((i) => i.id !== item.id && i.finalidade === item.finalidade)
            .sort(
              (a, b) =>
                Number(b.bairro === item.bairro) * 3 +
                Number(b.tipo === item.tipo) -
                (Number(a.bairro === item.bairro) * 3 +
                  Number(a.tipo === item.tipo)),
            )
            .slice(0, 3)
        : [],
    [items, item],
  );
  useEffect(() => {
    setGallery(null);
    setShareStatus("");
    if (!item) return;
    document.title = `${item.titulo} | VilaVix Imóveis`;
    const meta = document.querySelector('meta[name="description"]');
    const previous = meta?.content;
    if (meta)
      meta.content = `${item.titulo}, em ${location(item)}. ${money(item.preco)}. Veja fotos, características e agende uma visita com a VilaVix.`;
    return () => {
      if (meta && previous) meta.content = previous;
    };
  }, [item]);
  const closeGallery = React.useCallback(() => setGallery(null), []);
  const share = async () => {
    const url = new URL(propertyHref(item), window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: item.titulo, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareStatus("Link copiado para compartilhar.");
      }
    } catch (err) {
      if (err.name !== "AbortError")
        setShareStatus(
          "Copie o endereço desta página para compartilhar o imóvel.",
        );
    }
  };
  if (loading)
    return (
      <main className="public-site public-shell public-section">
        <div className="public-loading" role="status">
          Carregando imóvel…
        </div>
      </main>
    );
  if (!item)
    return (
      <main className="public-site public-shell public-section">
        <div className="public-empty">
          <h1>Imóvel não encontrado.</h1>
          <p>
            Ele pode ter saído do catálogo. Explore os imóveis disponíveis ou
            converse com nossa equipe.
          </p>
          <a
            className="public-button"
            href="/imoveis"
            onClick={(e) => goLink(e, navigate, "imoveis")}
          >
            Explorar imóveis
          </a>
        </div>
      </main>
    );
  const saved = favorites.includes(String(item.id));
  const message = `Olá! Tenho interesse no imóvel ${item.codigo}: ${item.titulo}, em ${location(item)}. Gostaria de saber mais e agendar uma visita. ${new URL(propertyHref(item), window.location.origin).href}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: item.titulo,
    description: item.descricao,
    url: new URL(propertyHref(item), window.location.origin).href,
    image: photos,
    mainEntity: {
      "@type": "Accommodation",
      name: item.titulo,
      address: {
        "@type": "PostalAddress",
        addressLocality: item.cidade,
        addressRegion: item.estado || "ES",
        addressCountry: "BR",
      },
      ...(item.area
        ? {
            floorSize: {
              "@type": "QuantitativeValue",
              value: item.area,
              unitCode: "MTK",
            },
          }
        : {}),
    },
    ...(item.preco
      ? {
          offers: {
            "@type": "Offer",
            price: item.preco,
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
            businessFunction:
              item.finalidade === "aluguel"
                ? "http://purl.org/goodrelations/v1#LeaseOut"
                : "http://purl.org/goodrelations/v1#Sell",
          },
        }
      : {}),
  };
  return (
    <main className="public-site">
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <div className="public-shell">
        <div className="public-detail-top">
          <nav className="public-breadcrumbs" aria-label="Caminho de navegação">
            <a href="/" onClick={(e) => goLink(e, navigate, "home")}>
              Início
            </a>
            <ChevronRight size={12} />
            <a href="/imoveis" onClick={(e) => goLink(e, navigate, "imoveis")}>
              Imóveis
            </a>
            <ChevronRight size={12} />
            <span>Ref. {item.codigo}</span>
          </nav>
          <div className="public-detail-heading">
            <div>
              <h1>{item.titulo}</h1>
              <p>
                <MapPin size={16} />
                {location(item)}
                {item.estado ? ` – ${item.estado}` : ""}
              </p>
            </div>
            <div className="public-detail-actions">
              <button
                className={saved ? "is-saved" : ""}
                aria-pressed={saved}
                onClick={() => toggle(item.id)}
              >
                <Heart size={17} fill={saved ? "currentColor" : "none"} />
                {saved ? "Salvo" : "Salvar"}
              </button>
              <button onClick={share}>
                <Share2 size={17} />
                Compartilhar
              </button>
            </div>
          </div>
          {shareStatus && (
            <p className="public-share-status" role="status">
              {shareStatus}
            </p>
          )}
        </div>
        {photos.length ? (
          <div
            className={`public-gallery${photos.length === 1 ? " has-one" : ""}`}
          >
            {photos.slice(0, 5).map((photo, index) => (
              <button
                key={photo}
                onClick={() => setGallery(index)}
                aria-label={`Abrir foto ${index + 1} de ${photos.length}`}
              >
                <PropertyImage
                  item={item}
                  src={photo}
                  index={index}
                  eager={index === 0}
                />
              </button>
            ))}
            <button
              className="public-gallery-more"
              onClick={() => setGallery(0)}
            >
              <Grid2X2 size={15} />
              Ver {photos.length} {photos.length === 1 ? "foto" : "fotos"}
            </button>
          </div>
        ) : (
          <div className="public-gallery-empty">
            <PropertyImage item={item} />
          </div>
        )}
        <div className="public-detail-layout">
          <aside
            className="public-detail-contact"
            aria-label="Valores e atendimento"
          >
            <small>
              {item.finalidade === "aluguel"
                ? "Aluguel mensal"
                : "Valor do imóvel"}
            </small>
            <div className="public-detail-price">
              {money(item.preco)}
              {item.finalidade === "aluguel" && item.preco ? (
                <small> /mês</small>
              ) : null}
            </div>
            {Number(item.condominio) > 0 && (
              <div className="public-detail-costs">
                Condomínio: {money(item.condominio)}
              </div>
            )}
            {Number(item.iptu) > 0 && (
              <div className="public-detail-costs">
                IPTU: {money(item.iptu)} <small>(consulte periodicidade)</small>
              </div>
            )}
            <h2>Gostou deste imóvel?</h2>
            <p>Fale com a VilaVix, tire suas dúvidas e combine uma visita.</p>
            <a
              className="public-button public-button-wine public-button-full"
              href={whatsappLink(message)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              Quero conhecer
            </a>
            <a href={`tel:+${CONTACT.whatsapp}`}>{CONTACT.phone}</a>
            <p className="public-price-note">
              Valores e disponibilidade sujeitos à confirmação. Imagens e
              características conforme anúncio. Ref. {item.codigo}.
            </p>
          </aside>
          <div className="public-detail-content">
            <div className="public-detail-overview">
              <span>
                {item.finalidade === "aluguel" ? "Para alugar" : "À venda"}
              </span>
              <span>{item.tipo}</span>
              <span>Ref. {item.codigo}</span>
            </div>
            <PropertyFacts item={item} full />
            {item.suites > 0 && (
              <p className="public-detail-costs" style={{ marginTop: 12 }}>
                {item.suites} {item.suites === 1 ? "suíte" : "suítes"}
              </p>
            )}
            <section className="public-detail-section">
              <h2>Um pouco mais sobre este imóvel</h2>
              <div className="public-detail-description">
                {item.descricao ||
                  "Converse com nossa equipe para conhecer os detalhes e as condições deste imóvel."}
              </div>
            </section>
            {item.caracteristicas?.length > 0 && (
              <section className="public-detail-section">
                <h2>O que você encontra aqui</h2>
                <ul className="public-amenities">
                  {item.caracteristicas.map((feature, index) => (
                    <li key={`${feature}-${index}`}>
                      <Check size={16} />
                      {typeof feature === "string"
                        ? feature
                        : feature.nome || feature.name || ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="public-detail-section">
              <h2>A localização</h2>
              <div className="public-location-panel">
                <MapPin size={25} />
                <div>
                  <p>
                    {location(item)}
                    {item.estado ? ` – ${item.estado}` : ""}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([item.bairro, item.cidade, item.estado || "ES"].filter(Boolean).join(", "))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Conheça a região no mapa <ArrowUpRight size={14} />
                  </a>
                  <small>
                    O mapa indica a região. Solicite o endereço completo à nossa
                    equipe.
                  </small>
                </div>
              </div>
            </section>
          </div>
        </div>
        {similar.length > 0 && (
          <section className="public-similar">
            <div className="public-section-heading">
              <h2>Outras possibilidades para você.</h2>
              <a
                className="public-text-link"
                href="/imoveis"
                onClick={(e) => goLink(e, navigate, "imoveis")}
              >
                Explorar catálogo <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="public-property-grid">
              {similar.map((i) => (
                <ImovelCard key={i.id} item={i} navigate={navigate} />
              ))}
            </div>
          </section>
        )}
      </div>
      {gallery !== null && (
        <GalleryDialog
          item={item}
          photos={photos}
          initial={gallery}
          onClose={closeGallery}
        />
      )}
    </main>
  );
}
