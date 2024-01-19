import "../styles/index.scss";
import ThemeProvider from "@/components/provider/ThemeProvider";
import { Analytics } from '@vercel/analytics/react';

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
