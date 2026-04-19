import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Zona Cup · El circuito competitivo de VALORANT en LATAM',
  description: 'Torneos 2v2 y 5v5 de VALORANT todas las semanas. Premios pagados en 48 horas. Ranking oficial. Argentina, Chile y Perú.',
  keywords: 'valorant, torneos, esports, argentina, chile, peru, latam, 2v2, 5v5, competitivo',
  openGraph: {
    title: 'Zona Cup · Torneos VALORANT LATAM',
    description: 'El circuito competitivo más serio de VALORANT en LATAM. Premios reales, ranking oficial, operación profesional.',
    images: ['/logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zona Cup · Torneos VALORANT LATAM',
    description: 'Torneos 2v2 y 5v5 todas las semanas. Premios en 48hs.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
