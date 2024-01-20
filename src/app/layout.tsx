import "../styles/index.scss";
import ThemeProvider from "@/components/provider/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  metadataBase: new URL('https://www.lucasrc.com.br'),
  title: {
    default: 'Lucas R. C. — Designer & Desenvolvedor',
    template: '%s — Lucas R. C.',
    absolute: 'Lucas R. C. — Designer & Desenvolvedor'
  },  
  description:
    "Lucas é um desenvolvedor e designer de Santa Catarina com foco em produtos criativos e de experiências únicas",

  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucas R. C. — Designer & Desenvolvedor",
    description:
      "Lucas é um desenvolvedor e designer de Santa Catarina com foco em produtos criativos e de experiências únicas",
    siteId: "1467726470533754880",
    creator: "Lucas R. C.",
    creatorId: "1467726470533754880",
    images: ["https://www.lucasrc.com.br/assets/img/logo/logo.png"], // Must be an absolute URL
  },
  openGraph: {
    title: "Lucas R. C. — Designer & Desenvolvedor",
    type: "website",
    authors: ["Lucas R. C."],
    description: "Lucas é um desenvolvedor e designer de Santa Catarina com foco em produtos criativos e de experiências únicas",
    url: "https://www.lucasrc.com.br",
    siteName: "Lucas R. C. — Designer & Desenvolvedor",
    images: [
      {
        url: "https://www.lucasrc.com.br/assets/img/logo/logo.png", // Must be an absolute URL
        width: 800,
        height: 600,
      },
      {
        url: "https://www.lucasrc.com.br/assets/img/logo/logo.png", // Must be an absolute URL
        width: 1800,
        height: 1600,
        alt: "Logotipo",
      },
    ],
    locale: "pt_BR",
    
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=DM+Sans:wght@400;500;700&family=EB+Garamond:wght@400;500;600;700;800&family=Kufam:wght@400;500;600;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning={true} className="scroll-smooth">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
