import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/shared/styles/globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SkillMap — карта навыков и понятный путь к профессии',
  description:
    'Превратите карьерную цель в интерактивную карту навыков и пошаговый план обучения. Gap Analysis, траектория по неделям, прогресс в одном месте.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body
        className="min-h-screen bg-page font-sans text-text antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}