import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import mobileCss from "../mobile-layout.css?url";
import readabilityCss from "../readability.css?url";

function NotFoundComponent() {
  return <div className="empty" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div><h1>404</h1><p>Página não encontrada.</p><Link to="/" className="link-btn">Voltar ao início</Link></div></div>;
}

function ErrorComponent() {
  return <div className="empty" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div><h1>Ops!</h1><p>Não foi possível carregar esta página.</p><Link to="/" className="link-btn">Voltar ao início</Link></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Despesas — Controle Financeiro" },
      { name: "description", content: "Controle suas despesas de forma simples e organizada." },
      { property: "og:title", content: "Despesas — Controle Financeiro" },
      { property: "og:description", content: "Controle financeiro pessoal simples e intuitivo." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }, { rel: "stylesheet", href: mobileCss }, { rel: "stylesheet", href: readabilityCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider>;
}
