# 03. Архитектура

## Монорепозиторий

```
/
├── apps/
│   ├── frontend/          # Next.js App Router + FSD
│   └── backend/           # FastAPI
├── docs/
├── AGENTS.md
└── docker-compose.yml     # (опционально) postgres, backend, frontend
```

---

## Frontend — Feature-Sliced Design

```
apps/frontend/src/
├── app/                    # Next.js routes, providers, layout
│   ├── (public)/           # лендинг, каталог, auth, публичная карта
│   ├── (student)/          # карта, траектория, gap, дашборд, профиль
│   ├── (admin)/            # админка
│   └── layout.tsx
├── widgets/                # композиция features (Header, SkillMapCanvas, DashboardKPI…)
├── features/               # действия пользователя
│   ├── auth/
│   ├── select-profession/
│   ├── mark-skill/
│   ├── onboarding/
│   └── generate-plan/
├── entities/               # бизнес-сущности
│   ├── user/
│   ├── profession/
│   ├── skill/
│   └── plan/
└── shared/
    ├── ui/                 # Button, Input, SkillNode, ProfessionCard…
    ├── api/                # fetch-клиент, base URL
    ├── lib/                # cn, hooks
    ├── config/             # colors, constants
    └── styles/             # globals.css
```

**Правила импортов FSD:**
- `shared` не знает ни о ком
- `entities` может использовать `shared`
- `features` → `entities` + `shared`
- `widgets` → `features` + `entities` + `shared`
- `app` → всё

**Не класть** бизнес-логику в `shared/ui`.  
**Не класть** UI-компоненты в `features` без крайней необходимости (лучше виджет).

---

## Backend — слои

```
apps/backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py      # JWT, password
│   │   └── database.py
│   ├── models/              # SQLAlchemy
│   ├── schemas/             # Pydantic request/response
│   ├── api/
│   │   ├── deps.py          # get_current_user
│   │   ├── auth.py
│   │   ├── professions.py
│   │   ├── skills.py
│   │   ├── me.py            # /me/skills, /me/gap, /me/plan, /me/dashboard
│   │   └── admin.py
│   └── services/
│       ├── gap.py
│       ├── plan.py
│       ├── graph.py         # топосорт, проверка циклов
│       └── pdf.py
├── tests/
└── alembic/                 # миграции
```

---

## Ключевые решения

| Решение | Выбор | Почему |
|---------|-------|--------|
| Граф на клиенте | React Flow | Интерактивность, zoom/pan, кастомные ноды |
| Состояние пользователя | React Query + JWT | Сервер — источник правды |
| Auth | JWT access + refresh + GitHub OAuth | Стандарт, поддержка OAuth из ТЗ |
| БД | PostgreSQL | Реляционные связи, граф зависимостей |
| Генерация плана | Backend service | Топосорт + часы — серверная ответственность |
| PDF | Клиент (html→pdf) или backend | Оба варианта допустимы; проще начать с клиента |

---

## Адаптив

- Desktop — основной сценарий карты.
- Tablet/Mobile — карта с нижней панелью карточки навыка (по макету дизайнера).
- Каталог и формы — полноценный responsive.

---

## Производительность

- Генерация карты / Gap / Plan ≤ 5 сек.
- Граф для одной профессии — обычно десятки узлов, не тысячи.
- При росте — кэширование эталонных графов.
