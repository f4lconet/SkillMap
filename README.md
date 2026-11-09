# SkillMap

Интерактивная карта навыков и компетенций для студентов.

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
