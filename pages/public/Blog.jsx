import React from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Home,
  Search,
} from "lucide-react";
import { goLink, whatsappLink } from "../../components/publicUtils.js";
const guides = [
  {
    Icon: Search,
    title: "Antes de começar a busca",
    intro: "Organize suas prioridades para comparar imóveis com mais clareza.",
    points: [
      "Liste o que precisa fazer parte da sua rotina: trabalho, escola, transporte, comércio e lazer.",
      "Separe o que é indispensável do que seria bom ter. Isso ajuda a escolher os filtros do catálogo.",
      "Defina a faixa de valor que você quer considerar e anote outros custos que precisa confirmar.",
      "Salve seus favoritos e compare localização, área, quartos, vagas e características.",
      "Compartilhe sua seleção com um corretor e conte por que gostou de cada imóvel.",
    ],
  },
  {
    Icon: Home,
    title: "Uma visita mais proveitosa",
    intro:
      "Um roteiro simples para observar o imóvel e fazer as perguntas certas.",
    points: [
      "Visite os ambientes com calma. Observe a circulação entre os espaços e imagine seus móveis.",
      "Preste atenção à entrada de luz, ventilação e aos sons ao redor.",
      "Confira tomadas, pontos de água e áreas de serviço com a equipe que acompanha a visita.",
      "Peça para conhecer as áreas comuns e confirme quais vagas e espaços fazem parte do imóvel.",
      "Anote dúvidas sobre as informações do anúncio, custos e condições para conversar com o corretor.",
    ],
  },
  {
    Icon: ClipboardList,
    title: "Prepare seu imóvel para anunciar",
    intro:
      "Reúna as informações que ajudam a apresentar seu imóvel a quem está procurando.",
    points: [
      "Organize os dados básicos: localização, tipo, área, quartos, banheiros, vagas e características.",
      "Reúna imagens atuais e nítidas dos ambientes, valorizando luz e organização.",
      "Anote melhorias feitas no imóvel e itens que estarão incluídos na negociação.",
      "Informe à equipe as condições desejadas e sua disponibilidade para visitas.",
      "Converse com a VilaVix sobre as informações e documentos necessários para iniciar o atendimento.",
    ],
  },
];
export default function BlogPage({ navigate }) {
  return (
    <main className="public-site">
      <section className="public-page-heading">
        <div className="public-shell">
          <nav className="public-breadcrumbs" aria-label="Caminho de navegação">
            <a href="/" onClick={(e) => goLink(e, navigate, "home")}>
              Início
            </a>
            <ChevronRight size={12} />
            <span>Guia imobiliário</span>
          </nav>
          <h1>Mais clareza para escolher.</h1>
          <p>
            Guias práticos para organizar sua busca, preparar uma visita e
            apresentar seu imóvel.
          </p>
        </div>
      </section>
      <section
        className="public-shell public-guide-layout"
        aria-label="Guias práticos"
      >
        {guides.map(({ Icon, title, intro, points }) => (
          <article className="public-guide-card" key={title}>
            <Icon size={30} />
            <h2>{title}</h2>
            <p>{intro}</p>
            <details>
              <summary>
                Confira o guia <ChevronDown size={17} />
              </summary>
              <ul>
                {points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </section>
      <section className="public-home-contact">
        <div className="public-shell">
          <div>
            <p className="public-kicker">Cada escolha tem seus detalhes</p>
            <h2>Uma conversa faz diferença.</h2>
          </div>
          <a
            className="public-button"
            href={whatsappLink()}
            target="_blank"
            rel="noreferrer"
          >
            Falar com a VilaVix <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
    </main>
  );
}
