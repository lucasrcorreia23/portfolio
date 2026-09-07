import { Archivo, Geist_Mono } from "next/font/google";

/**
 * Duas famílias, papéis rígidos — PROJECT.md §3.2.
 *
 * Archivo é variável nos eixos `wght` (100–900) e `wdth` (62–125). Pedir o
 * eixo `wdth` é o que dá acesso ao Expanded: o papel display usa
 * `font-stretch: 125%` (classe `.type-display`), o texto de leitura usa a
 * mesma família em largura normal e peso regular. Uma família, dois papéis,
 * um arquivo baixado.
 *
 * `subsets: ["latin"]` cobre todos os diacríticos do português (ã õ ç é ê
 * á í ó ú â) e as aspas e travessões usados no projeto. `latin-ext` só
 * acrescentaria peso para idiomas que o site não fala.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  variable: "--font-archivo",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

/**
 * Classe a aplicar no `<html>` para publicar as duas custom properties que
 * `styles/tokens.css` consome em `--font-display` / `--font-sans` / `--font-mono`.
 */
export const fontVariables = `${archivo.variable} ${geistMono.variable}`;
