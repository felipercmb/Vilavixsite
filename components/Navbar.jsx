import React, { useEffect, useRef, useState } from "react";
import { Heart, Menu, X, ArrowUpRight } from "lucide-react";
import { goLink } from "./publicUtils.js";
import { useFavorites } from "./useCatalog.js";
import Logo from "./Logo.jsx";
import "../styles/public.css";
export function PublicLogo({ navigate, light = false }) {
  return (
    <a
      className={`public-logo${light ? " is-light" : ""}`}
      href="/"
      onClick={(e) => goLink(e, navigate, "home")}
      aria-label="VilaVix Imóveis, início"
    >
      <Logo light={light} />
    </a>
  );
}
const links = [
  ["imoveis", "Encontrar imóvel"],
  ["aluguel", "Aluguel e gestão"],
  ["sobre", "A VilaVix"],
  ["blog", "Guia imobiliário"],
  ["contato", "Contato"],
];
export default function Navbar({ page, navigate }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { favorites } = useFavorites();
  useEffect(() => {
    setOpen(false);
  }, [page]);
  useEffect(() => {
    if (!open) return;
    const key = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  const go = (e, p, extras) => {
    goLink(e, navigate, p, extras);
    setOpen(false);
  };
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <PublicLogo navigate={navigate} />
        <nav
          className={`public-nav${open ? " is-open" : ""}`}
          id="public-navigation"
          aria-label="Navegação principal"
        >
          {links.map(([p, label]) => (
            <a
              key={p}
              href={`/${p}`}
              aria-current={page === p ? "page" : undefined}
              onClick={(e) => go(e, p)}
            >
              {label}
            </a>
          ))}
          <a
            className="public-nav-crm"
            href="/login"
            onClick={(e) => go(e, "login")}
          >
            Área do corretor <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="public-header-actions">
          <a
            className="public-favorite-nav"
            href="/imoveis?favorites=true"
            onClick={(e) => go(e, "imoveis", { filters: { favorites: true } })}
            aria-label={`Seus favoritos, ${favorites.length} ${favorites.length === 1 ? "imóvel" : "imóveis"}`}
          >
            <Heart size={19} />
            <span>{favorites.length ? favorites.length : "Favoritos"}</span>
          </a>
          <button
            className="public-menu-button"
            ref={menuRef}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="public-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
