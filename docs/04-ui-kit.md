# 04. UI-kit (SkillMap Design System)

> Источник: макет дизайнера + реализация в `shared/ui`.
> Все новые экраны обязаны использовать эти токены и компоненты.

## Цвета (CSS-переменные / Tailwind)

| Token | Hex | Назначение |
|-------|-----|------------|
| `accent` | `#5357D9` | Основной, кнопки, focus, selected |
| `text` | `#182137` | Основной текст |
| `secondary` | `#707B91` | Вторичный текст, helper |
| `page` | `#F6F7FB` | Фон страницы |
| `surface` | `#FFFFFF` | Карточки, панели |
| `border` | `#E3E7F0` | Границы |
| `accent-soft` | `#EEEDFF` | Мягкий акцент, active nav |
| `success` | `#218166` | Освоено |
| `success-soft` | `#E7F5EE` | Фон успеха |
| `warning` | `#A66B17` | Можно начать / внимание |
| `danger` | `#C24A56` | Ошибки, destructive |
| `danger-soft` | `#FCEEF0` | Фон ошибки |

Focus-ring: `rgba(83, 87, 217, 0.33)`.

## Типографика

Шрифт: **Inter** (400 / 500 / 600 / 700).

| Класс | Размер / line-height | Вес | Использование |
|-------|----------------------|-----|---------------|
| `text-hero` | 60 / 90 | 700 | Hero на лендинге |
| `text-h1` | 36 / 54 | 700 | H1 |
| `text-h2` | 32 / 48 | 700 | Заголовок страницы |
| `text-h3` | 25 / 37.5 | 700 | Auth / секции |
| `text-section` | 18 / 27 | 600 | Заголовок раздела |
| `text-body` | 14 / 21 | 400 | Основной текст |
| `text-label` | 13 / 19.5 | 600 | Label полей |
| `text-helper` | 12 / 18 | 400 | Helper / badge |
| `text-caption` | 11 / 16.5 | 700 | Мелкие подписи |

## Размеры

- Кнопка: высота **44px**, radius **12px**, padding 16, gap 8, font 14/600
- Поле ввода: высота **48px**, radius 12
- Nav item: высота **46px**
- SkillNode: ~158×79, radius 12, padding 11
- ProfessionCard: max-width ~428px

## Компоненты (уже есть / должны быть)

| Компонент | Путь | Варианты / состояния |
|-----------|------|----------------------|
| `Button` | `shared/ui/button` | primary, secondary, github, destructive + hover/focus/disabled |
| `Input` | `shared/ui/input` | default, focus, error, disabled + label/helper/errorText |
| `Select` | `shared/ui/select` | то же |
| `Checkbox` | `shared/ui/checkbox` | checked / unchecked / disabled |
| `Toggle` | `shared/ui/toggle` | on / off / disabled |
| `Badge` | `shared/ui/badge` | success, in-progress, available, locked, error |
| `Progress` | `shared/ui/progress` | value 0–100 |
| `ProfessionCard` | `shared/ui/card` | default / selected |
| `SkillNode` | `shared/ui/node` | mastered, in-progress, available, locked, selected |
| `NavItem` | `shared/ui/nav` | default / active |
| `OnboardingStep` | `shared/ui/onboarding` | complete / current / upcoming |

## Правила использования

1. **Не хардкодить** `#5357D9` — используй `bg-accent`, `text-accent`, `border-accent`.
2. Все формы — через `Input` / `Select` / `Checkbox` / `Toggle`.
3. Статусы навыков — только через `SkillNode` + `Badge`.
4. Кнопки действий — `Button` с правильным `variant`.
5. Фокус — системный ring из UI-kit (уже в компонентах).

## Пример импорта

```tsx
import {
  Button,
  Input,
  Badge,
  SkillNode,
  ProfessionCard,
  Progress,
  OnboardingStep,
} from '@/shared/ui';
```

## Где лежит код

Ожидаемое расположение после переноса:

```
apps/frontend/src/shared/
├── config/colors.ts
├── styles/globals.css
├── lib/cn.ts
└── ui/
    ├── button/
    ├── input/
    ├── ...
    └── index.ts
```

Если код ещё в корневом `src/shared` — перенести в `apps/frontend/src/shared` при инициализации frontend.
