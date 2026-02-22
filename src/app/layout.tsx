import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "FitSync — App de Treinos",
  description: "Crie treinos, registre seu progresso e compare sua evolução com amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="bg-orbs" />
        <div className="page-wrapper">
          <StoreProvider>
            <AuthProvider>{children}</AuthProvider>
          </StoreProvider>
        </div>
      </body>
    </html>
  );
}
