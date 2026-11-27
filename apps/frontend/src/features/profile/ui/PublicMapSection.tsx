'use client';

import Link from 'next/link';
import { Badge, Button, Input, Toggle } from '@/shared/ui';
import { useShareState } from '@/entities/public-profile';

type Props = {
  hasProfession: boolean;
};

/**
 * Блок «Публичная карта» в профиле: включение ссылки /u/{username},
 * копирование и отключение — через GET/POST/DELETE /me/share.
 */
export function PublicMapSection({ hasProfession }: Props) {
  const {
    state,
    enabled,
    shareUrl,
    loading,
    pending,
    error,
    copied,
    enable,
    disable,
    copyLink,
  } = useShareState();

  const busy = loading || pending !== null;
  const publicPath = state?.username ? `/u/${state.username}` : shareUrl;

  const handleToggle = () => {
    if (busy) return;
    if (enabled) void disable();
    else void enable();
  };

  return (
    <section
      id="public-map"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-section text-text">Публичная карта</h2>
            {loading ? (
              <Badge variant="neutral">Загружаем…</Badge>
            ) : enabled ? (
              <Badge variant="success" withDot>
                Включена
              </Badge>
            ) : (
              <Badge variant="locked">Выключена</Badge>
            )}
          </div>
          <p className="mt-1 text-body font-medium text-text">
            {enabled ? 'Карта доступна по ссылке' : 'Поделитесь картой по ссылке'}
          </p>
          <p className="text-helper text-secondary">
            Покажите навыки и прогресс без личных настроек.
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={handleToggle}
          disabled={busy || (!hasProfession && !enabled)}
          aria-label="Публичная карта"
        />
      </div>

      {!enabled && !hasProfession && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-page px-3 py-2.5 text-helper text-secondary">
          Чтобы открыть карту по ссылке, сначала выберите профессию в блоке{' '}
          <a href="#profile-settings" className="font-medium text-accent underline">
            «Личные данные и цель»
          </a>
          .
        </div>
      )}

      {enabled && shareUrl && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <Input
                label="Ссылка на карту"
                name="public-map-url"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mb-0.5"
              onClick={() => void copyLink()}
            >
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
            {publicPath && (
              <Link
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className="mb-0.5"
              >
                <Button variant="primary" size="sm">
                  Открыть
                </Button>
              </Link>
            )}
          </div>
          <p className="text-helper text-secondary">
            Email и учебный план не публикуются. Отключите переключатель, чтобы
            ссылка перестала работать.
          </p>
        </div>
      )}

      {enabled && !shareUrl && !loading && (
        <p className="mt-4 text-helper text-secondary">
          Ссылка ещё не создана. Выключите и включите публикацию заново.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-helper text-danger">
          {error}
        </div>
      )}
    </section>
  );
}
