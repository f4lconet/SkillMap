import type { Metadata } from 'next';
// Inter хостим сами (@fontsource): next/font/google требует доступа к
// fonts.googleapis.com на старте и ломает запуск без интернета.
import '@fontsource-variable/inter';
import '@/shared/styles/globals.css';

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
    <html lang="ru">
      <body
        className="min-h-screen bg-page font-sans text-text antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}