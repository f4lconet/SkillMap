'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Checkbox } from '@/shared/ui';
import { authApi } from '../api/authApi';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Укажите email';
    if (!password) next.password = 'Укажите пароль';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotMessage(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await authApi.login({
        email: email.trim(),
        password,
        remember,
      });
      authApi.persistSession(res, remember);
      router.push('/catalog'); // после входа — к выбору профессии
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось войти';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    setError(null);
    setForgotMessage(null);
    if (!email.trim()) {
      setFieldErrors({ email: 'Укажите email для восстановления' });
      return;
    }
    setForgotLoading(true);
    try {
      const message = await authApi.forgotPassword({ email: email.trim() });
      setForgotMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить ссылку');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="text-h3 text-text">С возвращением</h2>
      <p className="mt-1 text-body text-secondary">
        Продолжите с того места, где остановились.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-1 flex-col gap-4">
        <Input
          label="Электронная почта"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="elena.smirnova@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={Boolean(fieldErrors.email)}
          errorText={fieldErrors.email}
        />
        <Input
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(fieldErrors.password)}
          errorText={fieldErrors.password}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          }
        />

        <div className="flex items-center justify-between gap-3">
          <Checkbox
            label="Запомнить меня"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <button
            type="button"
            onClick={onForgot}
            disabled={forgotLoading}
            className="text-helper font-medium text-accent hover:underline disabled:opacity-60"
          >
            {forgotLoading ? 'Отправка…' : 'Забыли пароль?'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-helper text-danger">
            {error}
          </div>
        )}
        {forgotMessage && (
          <div className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-helper text-success">
            {forgotMessage}
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
          → Войти в SkillMap
        </Button>

        <div className="mt-2 rounded-xl bg-page px-4 py-3">
          <p className="text-body font-medium text-text">Не помните пароль?</p>
          <p className="mt-1 text-helper text-secondary">
            Отправим ссылку для восстановления на указанный email.
          </p>
          <button
            type="button"
            onClick={onForgot}
            disabled={forgotLoading}
            className="mt-2 text-helper font-medium text-accent hover:underline disabled:opacity-60"
          >
            Отправить ссылку на email →
          </button>
        </div>
      </form>
    </div>
  );
}
