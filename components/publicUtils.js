export const CONTACT = {
  phone: "(27) 98136-0170",
  whatsapp: "5527981360170",
  email: "atendimento@vilaviximoveis.com.br",
  address: "Rua Jair de Andrade, 1222, Itapuã, Vila Velha – ES",
  creci: "15.177J",
  instagram: "https://www.instagram.com/vilaviximoveis/",
};
export const money = (value) =>
  value === null || value === undefined || !Number(value)
    ? "Valor sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value);
export const number = (value) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
export const location = (item) =>
  [item.bairro, item.cidade].filter(Boolean).join(", ");
export const propertyHref = (item) =>
  `/imovel/${encodeURIComponent(item.slug || item.id)}`;
export const whatsappLink = (message) =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message || "Olá! Vim pelo site da VilaVix e gostaria de conversar sobre um imóvel.")}`;
export function goLink(event, navigate, page, extras) {
  if (
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.button === 0
  ) {
    event.preventDefault();
    navigate(page, extras);
  }
}
