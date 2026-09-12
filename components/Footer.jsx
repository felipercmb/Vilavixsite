import React from "react";
import { ArrowUpRight, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { PublicLogo } from "./Navbar.jsx";
import { CONTACT, goLink, whatsappLink } from "./publicUtils.js";
export default function Footer({ navigate }) {
  return (
    <footer className="public-footer">
      <div className="public-shell">
        <div className="public-footer-top">
          <div>
            <PublicLogo navigate={navigate} light />
            <p>O seu próximo endereço começa com uma boa conversa.</p>
            <a
              className="public-footer-social"
              href={CONTACT.instagram}
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={18} /> Acompanhe a VilaVix
            </a>
          </div>
          <div>
            <h2>Encontre seu lugar</h2>
            <a
              href="/imoveis?finalidade=venda"
              onClick={(e) =>
                goLink(e, navigate, "imoveis", {
                  filters: { finalidade: "venda" },
                })
              }
            >
              Imóveis à venda
            </a>
            <a
              href="/imoveis?finalidade=aluguel"
              onClick={(e) =>
                goLink(e, navigate, "imoveis", {
                  filters: { finalidade: "aluguel" },
                })
              }
            >
              Imóveis para alugar
            </a>
            <a href="/aluguel" onClick={(e) => goLink(e, navigate, "aluguel")}>
              Gestão completa de aluguel
            </a>
            <a
              href="/imoveis?favorites=true"
              onClick={(e) =>
                goLink(e, navigate, "imoveis", { filters: { favorites: true } })
              }
            >
              Meus favoritos
            </a>
            <a href="/contato" onClick={(e) => goLink(e, navigate, "contato")}>
              Anuncie seu imóvel
            </a>
          </div>
          <div>
            <h2>Vamos conversar</h2>
            <a href={whatsappLink()} target="_blank" rel="noreferrer">
              <Phone size={16} />
              {CONTACT.phone}
            </a>
            <a href={`mailto:${CONTACT.email}`}>
              <Mail size={16} />
              {CONTACT.email}
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={16} />
              {CONTACT.address}
            </a>
          </div>
        </div>
        <div className="public-footer-bottom">
          <p>
            © {new Date().getFullYear()} VilaVix Imóveis. CRECI-ES{" "}
            {CONTACT.creci}.
          </p>
          <a
            href="/contato?assunto=privacidade"
            onClick={(e) =>
              goLink(e, navigate, "contato", {
                filters: { assunto: "privacidade" },
              })
            }
          >
            Privacidade e seus dados
          </a>
          <a href="/login" onClick={(e) => goLink(e, navigate, "login")}>
            Área do corretor <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}
