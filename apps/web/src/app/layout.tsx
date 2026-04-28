import type { ReactNode } from "react";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "Arquiteure",
  description: "Plataforma autoevolutiva de arquitetura e engenharia (PT).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <Providers>
          <header className="hdr">
            <strong>Arquiteure</strong>
            <span className="tag">arquitetura · engenharia · urbanismo</span>
            <nav className="hdr-nav">
              <Link href="/projects">Projetos</Link>
              <Link href="/iso-consultant">Consultor ISO</Link>
            </nav>
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
