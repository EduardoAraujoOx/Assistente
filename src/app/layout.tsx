import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transferegov Assistente \u2014 SEFAZ-ES",
  description:
    "Plano de Trabalho Pr\u00e9-preenchido \u2014 Transfer\u00eancias Especiais 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
