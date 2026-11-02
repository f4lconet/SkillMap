# UI-kit (SkillMap Design System)

Реализация UI-kit из макета для проекта Next.js + TypeScript + Feature-Sliced Design.

## Структура (FSD)

```
src/
└── shared/
    ├── config/
    │   └── colors.ts          # Design tokens
    ├── styles/
    │   └── globals.css        # CSS variables + Tailwind
    ├── lib/
    │   └── cn.ts              # clsx + tailwind-merge
    └── ui/
        ├── button/
        ├── input/
        ├── select/
        ├── checkbox/
        ├── toggle/
        ├── badge/
        ├── progress/
        ├── card/              # ProfessionCard
        ├── node/              # SkillNode (карта навыков)
        ├── nav/               # NavItem
        ├── onboarding/        # OnboardingStep
        └── index.ts           # Public API
```

## Установка зависимостей

```bash
npm install clsx tailwind-merge
# или
pnpm add clsx tailwind-merge
```

Inter шрифт (рекомендуется через next/font):

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

## Подключение стилей

В `src/app/layout.tsx` или `src/app/globals.css`:

```ts
import '@/shared/styles/globals.css';
```

В `tailwind.config.ts` уже прописаны цвета и типографика (см. корень проекта).

## Использование

```tsx
import {
  Button,
  Input,
  Select,
  Checkbox,
  Toggle,
  Badge,
  Progress,
  ProfessionCard,
  SkillNode,
  NavItem,
  OnboardingStep,
} from '@/shared/ui';

// Кнопки
<Button variant="primary">Сохранить изменения</Button>
<Button variant="secondary">Изменить пароль</Button>
<Button variant="github" leftIcon={<GitHubIcon />}>Войти с GitHub</Button>
<Button variant="destructive">Удалить аккаунт</Button>

// Формы
<Input
  label="Имя"
  placeholder="Елена Смирнова"
  helperText="Как к вам обращаться"
/>
<Input
  label="Пароль"
  type="password"
  error
  errorText="Пароль должен содержать не менее 8 символов"
/>
<Select
  label="Целевой уровень"
  options={[
    { value: 'junior', label: 'Junior' },
    { value: 'middle', label: 'Middle' },
  ]}
  placeholder="Выберите уровень"
/>
<Checkbox label="Запомнить меня" />
<Toggle label="Публичная карта" />

// Статусы
<Badge variant="success" withDot>Освоено</Badge>
<Badge variant="in-progress" withDot>В процессе</Badge>
<Badge variant="available" withDot>Можно начать</Badge>
<Badge variant="locked">Недоступно</Badge>
<Badge variant="error">Ошибка</Badge>

// Прогресс
<Progress value={12} max={30} label="12/30 навыков" />

// Карточка профессии
<ProfessionCard
  title="Frontend-разработчик"
  description="Создавайте интерфейсы сайтов и веб-приложений."
  stats="30 навыков · 168 ч · Junior"
  selected
  onSelect={() => {}}
  onView={() => {}}
/>

// Нода навыка
<SkillNode
  title="JavaScript"
  subtitle="Основы языка"
  status="mastered"
/>
<SkillNode title="Асинхронность" subtitle="Promises, async / await" status="in-progress" />
<SkillNode title="DevTools" subtitle="Отладка приложений" status="available" />
<SkillNode title="Тестирование" subtitle="Зависимости закрыты" status="locked" />
<SkillNode title="Асинхронность" subtitle="Promises, async / await" status="selected" />

// Навигация
<NavItem label="Профиль" active icon={<UserIcon />} />

// Онбординг
<OnboardingStep number={1} title="Цель" subtitle="Frontend-разработчик" status="complete" />
<OnboardingStep number={2} title="Уровень" subtitle="Текущий шаг" status="current" />
<OnboardingStep number={3} title="Часы" subtitle="Следующий шаг" status="upcoming" />
```

## Цвета (CSS variables)

| Token          | Hex       | Использование                  |
|----------------|-----------|--------------------------------|
| accent         | #5357D9   | Основной, кнопки, focus        |
| text           | #182137   | Основной текст                 |
| secondary      | #707B91   | Вторичный текст                |
| page           | #F6F7FB   | Фон страницы                   |
| surface        | #FFFFFF   | Карточки, панели               |
| border         | #E3E7F0   | Границы                        |
| accent-soft    | #EEEDFF   | Мягкий акцент                  |
| success        | #218166   | Успех                          |
| success-soft   | #E7F5EE   | Фон успеха                     |
| warning        | #A66B17   | Предупреждение                 |
| danger         | #C24A56   | Ошибки, destructive            |
| danger-soft    | #FCEEF0   | Фон ошибки                     |

## Типографика

Используйте классы Tailwind: `text-hero`, `text-h1`, `text-h2`, `text-h3`, `text-section`, `text-body`, `text-label`, `text-helper`, `text-caption`.

Или напрямую размеры из макета.

## Path aliases

В `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Рекомендации FSD

- Все UI-компоненты живут **только** в `shared/ui`.
- Бизнес-логика (выбор цели, карта навыков) — в `features/` и `entities/`.
- Страницы собирают виджеты из `widgets/`.
- Не импортируйте UI из `pages` или `app` напрямую в shared (нарушение слоёв).
