import type { Metadata } from "next";
import { Inter, Roboto, Montserrat } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { StoreProvider } from "@/lib/store";

const fontInter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fontRoboto = Roboto({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-roboto' });
const fontMontserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: "uFit — App de Treinos",
  description: "Crie treinos, registre seu progresso e compare sua evolução com amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className={`${fontInter.variable} ${fontRoboto.variable} ${fontMontserrat.variable}`}>
        <div className="page-wrapper">
          <StoreProvider>
            <AuthProvider>{children}</AuthProvider>
          </StoreProvider>
        </div>
      </body>
    </html>
  );
}
