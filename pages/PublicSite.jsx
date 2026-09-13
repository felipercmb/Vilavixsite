import React from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import WppFloat from "../components/WppFloat.jsx";
import HomePage from "./public/Home.jsx";
import AluguelPage from "./public/Aluguel.jsx";
import ImoveisPage from "./public/Imoveis.jsx";
import ImovelDetailPage from "./public/ImovelDetail.jsx";
import SobrePage from "./public/Sobre.jsx";
import ContatoPage from "./public/Contato.jsx";
import BlogPage from "./public/Blog.jsx";

export default function PublicSite({ route, navigate }) {
  const props = {
    navigate,
    filters: route.filters || {},
    initialFilters: route.filters || {},
  };
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <Navbar page={route.page} navigate={navigate} />
      <div id="main-content" tabIndex={-1} style={{ minHeight: "65vh" }}>
        {route.page === "home" && <HomePage {...props} />}
        {route.page === "imoveis" && <ImoveisPage {...props} />}
        {route.page === "aluguel" && <AluguelPage {...props} />}
        {route.page === "imovel-detail" && (
          <ImovelDetailPage {...props} imovelId={route.imovelId} />
        )}
        {route.page === "sobre" && <SobrePage {...props} />}
        {route.page === "contato" && <ContatoPage {...props} />}
        {route.page === "blog" && <BlogPage {...props} />}
      </div>
      <Footer navigate={navigate} />
      <WppFloat />
    </>
  );
}
