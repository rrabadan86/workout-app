import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { StoreProvider } from "@/lib/store";

const fontInter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700', '800', '900'] });

export const metadata: Metadata = {
  title: "uFit — App de Treinos",
  description: "Crie treinos, registre seu progresso e compare sua evolução com amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={fontInter.variable}>
        <div className="page-wrapper">
          <StoreProvider>
            <AuthProvider>{children}</AuthProvider>
          </StoreProvider>
        </div>
      </body>
    </html>
  );
}
