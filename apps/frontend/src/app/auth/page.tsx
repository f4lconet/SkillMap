import Link from 'next/link';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';
import { LoginForm } from '@/features/auth/ui/LoginForm';

export const metadata = {
  title: 'Вход и регистрация — SkillMap',
  description: 'Создайте аккаунт или войдите, чтобы продолжить обучение.',
};

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-page">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-semibold text-text">SkillMap</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-secondary transition-colors hover:text-text"
          >
            ← Вернуться на главную
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-h2 tracking-tight text-text sm:text-[36px]">
            Новая цель — или следующий шаг к ней.
          </h1>
          <p className="mt-2 text-body text-secondary">
            Создайте аккаунт или войдите, чтобы продолжить обучение.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr_1fr] lg:items-stretch">
          {/* Left promo panel */}
          <aside className="flex flex-col justify-between rounded-2xl bg-[#0F1729] p-6 text-white sm:p-8">
            <div>
              <span className="inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                Учитесь с направлением
              </span>
              <h2 className="mt-5 text-[28px] font-bold leading-tight tracking-tight">
                Соберите навыки в цельную картину.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Карта, которая растёт вместе с вами.
              </p>
            </div>

            <ul className="mt-10 space-y-3 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                Личная карта навыков
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                План в вашем темпе
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                Сохранённый прогресс
              </li>
            </ul>
          </aside>

          <RegisterForm />
          <LoginForm />
        </div>

      </main>
    </div>
  );
}