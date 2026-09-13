import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import LoginPage from "./pages/Login.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { supabase } from "./lib/supabase.js";
import { authSignOut } from "./lib/db.js";
const PublicSite = lazy(() => import("./pages/PublicSite.jsx"));
const CrmLayout = lazy(() => import("./pages/crm/CrmLayout.jsx"));
const titleMap = {
  home: "Imóveis na Grande Vitória",
  imoveis: "Encontre seu imóvel",
  aluguel: "Aluguel e gestão completa",
  sobre: "Conheça a VilaVix",
  contato: "Fale com a VilaVix",
  blog: "Conteúdo para sua próxima escolha",
  login: "Acesso ao CRM",
  crm: "CRM",
};
function readRoute() {
  const [path, query = ""] = (
    window.location.hash.startsWith("#/")
      ? window.location.hash.slice(1)
      : window.location.pathname + window.location.search
  ).split("?");
  const parts = path
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
  const params = Object.fromEntries(new URLSearchParams(query));
  if (params.favorites) params.favorites = params.favorites === "true";
  if (parts[0] === "imovel")
    return { page: "imovel-detail", imovelId: parts[1], filters: params };
  if (parts[0] === "crm")
    return {
      page: "crm",
      crmMenu: parts[1] || "dashboard",
      demo: params.demo === "true" && import.meta.env.DEV,
    };
  return {
    page: [
      "imoveis",
      "aluguel",
      "sobre",
      "contato",
      "blog",
      "login",
      "redefinir-senha",
    ].includes(parts[0])
      ? parts[0]
      : "home",
    filters: params,
  };
}
export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useCallback((page, extras = {}) => {
    const path =
      page === "home"
        ? "/"
        : page === "imovel-detail"
          ? `/imovel/${encodeURIComponent(extras.imovelId)}`
          : page === "crm"
            ? `/crm/${extras.crmMenu || "dashboard"}`
            : `/${page}`;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(extras.filters || {}))
      if (
        value !== "" &&
        value !== undefined &&
        value !== null &&
        value !== false
      )
        query.set(key, String(value));
    if (extras.demo && import.meta.env.DEV) query.set("demo", "true");
    window.history.pushState({}, "", `${path}${query.size ? "?" + query : ""}`);
    setRoute(readRoute());
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  useEffect(() => {
    const changed = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", changed);
    window.addEventListener("popstate", changed);
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("popstate", changed);
    };
  }, []);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => live && setAuthLoading(false), 5000);
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (live) {
          setAuthUser(data.session?.user || null);
          setAuthLoading(false);
        }
      })
      .catch(() => live && setAuthLoading(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (live) {
        setAuthUser(session?.user || null);
        setAuthLoading(false);
        if (event === "PASSWORD_RECOVERY") navigate("redefinir-senha");
      }
    });
    return () => {
      live = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [navigate]);
  useEffect(() => {
    if (route.page !== "imovel-detail")
      document.title = `${titleMap[route.page] || "VilaVix"} | VilaVix Imóveis`;
  }, [route.page]);
  const loading = (
    <div role="status" style={{ padding: 64, textAlign: "center" }}>
      Carregando sua área de trabalho…
    </div>
  );
  if (route.page === "redefinir-senha")
    return (
      <ResetPassword
        user={authUser}
        loading={authLoading}
        navigate={navigate}
      />
    );
  if (route.page === "crm") {
    if (authLoading && !route.demo) return loading;
    if (authUser || route.demo)
      return (
        <Suspense fallback={loading}>
          <CrmLayout
            key={route.demo ? "demo" : authUser.id}
            demo={Boolean(route.demo)}
            user={
              route.demo
                ? {
                    id: "local-review",
                    email: "revisao@local",
                    user_metadata: { nome: "Revisão local" },
                  }
                : authUser
            }
            menu={route.crmMenu}
            setMenu={(crmMenu) =>
              navigate("crm", { crmMenu, demo: route.demo })
            }
            navigate={navigate}
            onLogout={async () => {
              if (!route.demo) await authSignOut();
              navigate("home");
            }}
          />
        </Suspense>
      );
  }
  if (route.page === "login" || route.page === "crm")
    return (
      <LoginPage
        navigate={navigate}
        onLogin={(user) => {
          setAuthUser(user);
          navigate("crm");
        }}
        onDemo={
          import.meta.env.DEV
            ? () => navigate("crm", { demo: true })
            : undefined
        }
      />
    );
  return (
    <Suspense
      fallback={
        <main role="status" style={{ padding: 64, textAlign: "center" }}>
          Carregando o site VilaVix…
        </main>
      }
    >
      <PublicSite route={route} navigate={navigate} />
    </Suspense>
  );
}
