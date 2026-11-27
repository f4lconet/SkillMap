import type { Metadata } from 'next';
import { AuthHeader } from '@/widgets/auth-header';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';
import { LoginForm } from '@/features/auth/ui/LoginForm';

export const metadata: Metadata = {
  title: 'Вход и регистрация — SkillMap',
  description:
    'Войдите в SkillMap или создайте аккаунт, чтобы продолжить обучение по личной карте навыков.',
};

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-page">
      <AuthHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
        <div className="mb-6 max-w-2xl sm:mb-10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
            Ваш личный маршрут
          </p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text sm:text-[36px]">
            Новая цель — или
            <br className="sm:hidden" /> следующий шаг к ней.
          </h1>
          <p className="mt-2 text-sm text-secondary sm:text-body">
            Создайте аккаунт или войдите, чтобы продолжить обучение.
          </p>
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[280px_1fr_1fr] lg:items-stretch">
          <aside className="hidden flex-col justify-between rounded-2xl bg-[#0F1729] p-6 text-white sm:p-8 lg:flex">
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

        <p className="mt-8 text-center text-xs text-secondary sm:mt-10">
          Ваши отметки навыков и планы сохраняются в аккаунте и доступны после
          входа.
        </p>
      </main>
    </div>
  );
}
