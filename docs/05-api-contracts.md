# 05. API Contracts (основные)

> Base URL: `/api/v1`  
> Auth: `Authorization: Bearer <access_token>`  
> Формат ошибок: `{ "detail": "..." }` или validation errors FastAPI.

## Auth

| Method | Path | Описание |
|--------|------|----------|
| POST | `/auth/register` | email, password, name → tokens |
| POST | `/auth/login` | email, password → tokens |
| POST | `/auth/refresh` | refresh_token → new access |
| POST | `/auth/forgot-password` | email → send link |
| POST | `/auth/reset-password` | token, new_password |
| GET | `/auth/github` | redirect OAuth |
| GET | `/auth/github/callback` | code → tokens |

## Professions (публичные)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/professions` | список (search, direction, level filters) |
| GET | `/professions/{id}` | детали |
| GET | `/professions/{id}/graph` | узлы + рёбра + ресурсы (для React Flow) |

## Me (студент, auth required)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/me` | профиль |
| PATCH | `/me` | name, hours_per_week, level, target_profession_id |
| GET | `/me/skills` | UserSkill[] |
| PUT | `/me/skills/{skill_id}` | status, level |
| POST | `/me/skills/bulk` | массовая отметка (онбординг) |
| GET | `/me/gap` | Gap Analysis result |
| GET | `/me/dashboard` | KPI + ближайшие шаги |
| GET | `/me/plan` | текущий план |
| POST | `/me/plan/recalculate` | пересчёт |
| POST | `/me/share` | вкл/выкл публичную ссылку |
| GET | `/me/share` | текущий статус + url |

## Public

| Method | Path | Описание |
|--------|------|----------|
| GET | `/public/{token}` | read-only карта + % (без auth) |

## Admin (editor/admin)

| Method | Path | Описание |
|--------|------|----------|
| CRUD | `/admin/professions` | |
| CRUD | `/admin/skills` | |
| CRUD | `/admin/dependencies` | + проверка циклов |
| CRUD | `/admin/resources` | |

## Примеры ответов (схематично)

### Graph
```json
{
  "nodes": [
    {
      "id": "js",
      "title": "JavaScript",
      "description": "...",
      "complexity": 2,
      "estimated_hours": 20,
      "status": "mastered",
      "level": 2,
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    { "id": "e1", "source": "js", "target": "async" }
  ]
}
```

### Gap
```json
{
  "match_percent": 35,
  "mastered": [{ "skill_id": "...", "title": "...", "level": 2 }],
  "missing": [{ "skill_id": "...", "title": "...", "priority": 1 }]
}
```

### Plan
```json
{
  "weeks": [
    {
      "week": 1,
      "items": [
        {
          "skill_id": "...",
          "title": "...",
          "hours": 8,
          "resources": [{ "title": "...", "url": "...", "type": "course" }]
        }
      ]
    }
  ],
  "current_week": 1
}
```

---

При реализации придерживайся этих контрактов. Если нужно расширить — обнови этот файл.
