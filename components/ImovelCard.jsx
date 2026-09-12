import React, { useEffect, useState } from "react";
import {
  Bath,
  BedDouble,
  CarFront,
  Heart,
  ImageOff,
  MoveUpRight,
  Ruler,
} from "lucide-react";
import {
  goLink,
  location,
  money,
  number,
  propertyHref,
} from "./publicUtils.js";
import { useFavorites } from "./useCatalog.js";
export function PropertyImage({
  item,
  src,
  className = "",
  eager = false,
  index = 0,
}) {
  const [failed, setFailed] = useState(false);
  const url = src || item?.img || item?.fotos?.[0];
  useEffect(() => {
    setFailed(false);
  }, [url]);
  if (!url || failed)
    return (
      <div className={`public-image-placeholder ${className}`}>
        <ImageOff size={28} />
        <span>Foto indisponível</span>
      </div>
    );
  return (
    <img
      className={className}
      src={url}
      alt={`${item?.titulo || "Imóvel VilaVix"}${index ? `, foto ${index + 1}` : ""}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
export function PropertyFacts({ item, full = false }) {
  const facts = [
    [Ruler, item.area, item.area ? `${number(item.area)} m²` : "", "Área"],
    [
      BedDouble,
      item.quartos,
      `${item.quartos} ${item.quartos === 1 ? "quarto" : "quartos"}`,
      "Quartos",
    ],
    [
      CarFront,
      item.vagas,
      `${item.vagas} ${item.vagas === 1 ? "vaga" : "vagas"}`,
      "Vagas",
    ],
  ];
  if (full)
    facts.push([
      Bath,
      item.banheiros,
      `${item.banheiros} ${item.banheiros === 1 ? "banheiro" : "banheiros"}`,
      "Banheiros",
    ]);
  return (
    <div className={`public-property-facts${full ? " is-full" : ""}`}>
      {facts
        .filter(
          ([, value]) =>
            value !== null && value !== undefined && Number(value) > 0,
        )
        .map(([Icon, value, text, label]) => (
          <span key={label}>
            <Icon size={17} aria-hidden="true" />
            {text}
          </span>
        ))}
    </div>
  );
}
export default function ImovelCard({
  imovel,
  item = imovel,
  navigate,
  onView,
  compact = false,
}) {
  const { favorites, toggle } = useFavorites();
  const favorite = favorites.includes(String(item.id));
  const open = (e) => {
    if (navigate)
      goLink(e, navigate, "imovel-detail", { imovelId: item.slug || item.id });
    else if (onView) {
      e.preventDefault();
      onView(item.id);
    }
  };
  return (
    <article className={`public-property-card${compact ? " is-compact" : ""}`}>
      <div className="public-property-photo">
        <a
          href={propertyHref(item)}
          onClick={open}
          tabIndex={-1}
          aria-hidden="true"
        >
          <PropertyImage item={item} />
        </a>
        <div className="public-property-tags">
          <span>{item.finalidade === "aluguel" ? "Aluguel" : "Venda"}</span>
          {item.destaque && <span className="is-highlight">Destaque</span>}
        </div>
        <button
          className={`public-heart${favorite ? " is-saved" : ""}`}
          aria-label={
            favorite
              ? `Remover ${item.titulo} dos favoritos`
              : `Salvar ${item.titulo} nos favoritos`
          }
          aria-pressed={favorite}
          onClick={() => toggle(item.id)}
        >
          <Heart size={19} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="public-property-body">
        <p className="public-property-location">{location(item)}</p>
        <h3>
          <a href={propertyHref(item)} onClick={open}>
            {item.titulo}
          </a>
        </h3>
        <PropertyFacts item={item} />
        <div className="public-property-bottom">
          <div>
            <small>
              {item.finalidade === "aluguel"
                ? "Aluguel mensal"
                : item.tipo || "Imóvel"}
            </small>
            <strong>
              {money(item.preco)}
              {item.finalidade === "aluguel" && item.preco ? (
                <small> /mês</small>
              ) : null}
            </strong>
          </div>
          <a
            className="public-card-arrow"
            href={propertyHref(item)}
            onClick={open}
            aria-label={`Ver detalhes de ${item.titulo}`}
          >
            <MoveUpRight size={20} />
          </a>
        </div>
      </div>
    </article>
  );
}
