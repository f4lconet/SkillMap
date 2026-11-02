# SkillMap

Интерактивная карта навыков и компетенций для студентов.

## Для AI-агента

**Начни с файла [`AGENTS.md`](./AGENTS.md)** — там полный контекст, правила и ссылки на детальные документы.

```
docs/
├── 01-project-overview.md
├── 02-domain-model.md
├── 03-architecture.md
├── 04-ui-kit.md
├── 05-api-contracts.md
├── 06-mvp-scope.md
└── 07-screens-and-flows.md
```

## Структура

```
apps/
├── frontend/   # Next.js + TypeScript + FSD + Tailwind + React Flow
└── backend/    # FastAPI + PostgreSQL
```

## Быстрый старт (когда репозиторий инициализирован)

```bash
# Frontend
npm install && npm run dev

# Backend
cd apps/backend && poetry install && uvicorn app.main:app --reload
```

## UI-kit

Компоненты и токены описаны в `docs/04-ui-kit.md`.  
Реализация (Button, Input, SkillNode, ProfessionCard и др.) лежит в `apps/frontend/src/shared`.
