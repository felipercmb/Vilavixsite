import { useEffect, useState } from "react";
import { catalogSnapshot, getPublicCatalog } from "../lib/catalog.js";
export default function useCatalog() {
  const [state, setState] = useState({
    items: catalogSnapshot.filter((i) => i.status === "disponivel"),
    loading: !catalogSnapshot.length,
    error: null,
  });
  useEffect(() => {
    let live = true;
    getPublicCatalog()
      .then(({ data, error }) => {
        if (live) setState({ items: data || [], loading: false, error });
      })
      .catch(() => {
        if (live)
          setState((s) => ({
            ...s,
            loading: false,
            error: "Não foi possível atualizar os imóveis. Tente novamente.",
          }));
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
const KEY = "vilavix:favorites:v1";
let sessionFavorites = [];
let storageUnavailable = false;
const readFavorites = () => {
  if (storageUnavailable) return sessionFavorites;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return sessionFavorites;
  }
};
export function useFavorites() {
  const [favorites, setFavorites] = useState(readFavorites);
  useEffect(() => {
    const changed = () => setFavorites(readFavorites());
    window.addEventListener("storage", changed);
    window.addEventListener("vilavix:favorites", changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("vilavix:favorites", changed);
    };
  }, []);
  const toggle = (id) => {
    const current = readFavorites();
    const key = String(id);
    const next = current.includes(key)
      ? current.filter((i) => i !== key)
      : [...current, key];
    sessionFavorites = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      storageUnavailable = true;
    }
    setFavorites(next);
    window.dispatchEvent(new Event("vilavix:favorites"));
  };
  return { favorites, toggle };
}
