'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Checkbox } from '@/shared/ui';
import { authApi } from '../api/authApi';

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Укажите имя';
    if (!email.trim()) next.email = 'Укажите email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Некорректный email';
    if (password.length < 8) next.password = 'Не менее 8 символов';
    else if (password.length > 128) next.password = 'Не более 128 символов';
    else if (!/[a-zA-Zа-яА-Я]/.test(password) || !/\d/.test(password)) {
      next.password = 'Нужны хотя бы одна буква и одна цифра';
    }
    if (!acceptTerms) next.terms = 'Нужно принять условия';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await authApi.register({ name: name.trim(), email: email.trim(), password });
      authApi.persistSession(res, true);
      router.push('/catalog'); // после регистрации — к выбору профессии / онбордингу
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось создать аккаунт';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="text-h3 text-text">Создать аккаунт</h2>
      <p className="mt-1 text-body text-secondary">Ваш маршрут начнётся здесь.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-1 flex-col gap-4">
        <Input
          label="Имя"
          name="name"
          autoComplete="name"
          placeholder="Елена Смирнова"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={Boolean(fieldErrors.name)}
          errorText={fieldErrors.name}
        />
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
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(fieldErrors.password)}
          errorText={fieldErrors.password}
          helperText={!fieldErrors.password ? 'Не менее 8 символов, буквы и цифры' : undefined}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          }
        />

        <Checkbox
          label="Принимаю условия использования и политику конфиденциальности"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        />
        {fieldErrors.terms && (
          <p className="-mt-2 text-helper text-danger">{fieldErrors.terms}</p>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-helper text-danger">
            {error}
          </div>
        )}

        <div className="mt-auto pt-2">
          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            → Создать аккаунт
          </Button>
        </div>
      </form>
    </div>
  );
}
