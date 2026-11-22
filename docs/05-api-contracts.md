# 05. API Contracts (основные)

> Base URL: `/api/v1`  
> Auth: `Authorization: Bearer <access_token>`  
> Формат ошибок: `{ "detail": "..." }`. Ошибки валидации: HTTP 422
> `{ "detail": "Ошибка валидации", "errors": [ ... ] }`.
> Все тексты ошибок — на русском, их можно показывать пользователю как есть.

## Соглашения

| Код | Когда |
|-----|-------|
| 400 | некорректный запрос (невалидный токен сброса/верификации, ошибка OAuth, нет цели в профиле) |
| 401 | нет/просрочен access-токен |
| 403 | недостаточно прав (`"Недостаточно прав"`) |
| 404 | объект не найден |
| 409 | конфликт: дубликат slug, связь создаёт **цикл** в графе |
| 422 | ошибка валидации тела/параметров, зависимость навыка от самого себя |

## Auth

| Method | Path | Описание |
|--------|------|----------|
| POST | `/auth/register` | email, password, name → tokens |
| POST | `/auth/login` | email, password → tokens |
| POST | `/auth/refresh` | refresh_token → новая пара токенов |
| POST | `/auth/logout` | инвалидирует refresh-токен |
| POST | `/auth/verify-email` | подтверждение email по токену из письма |
| POST | `/auth/resend-verification` | повторная отправка письма |
| POST | `/auth/password-reset/request` | email → письмо со ссылкой |
| POST | `/auth/password-reset/confirm` | token + new_password |
| GET | `/auth/github` | redirect OAuth |
| GET | `/auth/github/callback` | code → tokens |

## Professions (публичные)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/professions` | каталог: `q`, `direction`, `limit`, `offset` |
| GET | `/professions/directions` | список направлений (для фильтра) |
| GET | `/professions/{profession_id}` | детали профессии |
| GET | `/professions/{profession_id}/map` | узлы + рёбра + ресурсы для React Flow; для авторизованного пользователя узлы содержат `user_status`, `self_score`, `locked` |

## Me (студент, auth required)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/me` | профиль |
| PATCH | `/me` | `name`, `hours_per_week`, `level`, `target_profession_id` |
| GET | `/me/skills` | `UserSkillRead[]` |
| PUT | `/me/skills/{skill_id}` | `status`, `self_score` |
| POST | `/me/skills/bulk` | массовая отметка (онбординг, до 100 навыков) |
| GET | `/me/gap` | Gap Analysis по цели пользователя |
| GET | `/me/gap/{profession_id}` | Gap Analysis по конкретной профессии |
| GET | `/me/dashboard` | KPI + ближайшие шаги + активность |
| GET | `/me/plan` | текущий план (сохранённый) |
| POST | `/me/plan/recalculate` | пересчёт плана по актуальным навыкам |
| PATCH | `/me/plan/items/{item_id}` | статус пункта плана (`planned/done/skipped`) |
| POST | `/me/plan/weeks/{week_number}/complete` | закрыть неделю целиком |
| GET | `/me/trajectory/{profession_id}` | траектория по неделям (без сохранения) |
| GET | `/me/share` | статус публичной ссылки |
| POST | `/me/share` | включить публичную ссылку |
| DELETE | `/me/share` | отключить и удалить токен |
| GET | `/me/export` | данные для клиентского рендера PDF |

## Public (без auth)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/public/{token}` | read-only карта + Gap + план (без email и служебных полей) |

## Admin (editor/admin)

Все роуты `/admin/*` требуют роль `EDITOR` (`Depends(require_role(UserRole.EDITOR))`),
иначе `403 {"detail": "Недостаточно прав"}`. `GET /admin/ping` — дешёвая проверка прав.

### Профессии

| Method | Path | Описание |
|--------|------|----------|
| GET | `/admin/professions` | `q`, `status` (alias для `status_filter`), `limit` (1..200, по умолчанию 50), `offset` |
| POST | `/admin/professions` | создать; `slug` уникален (409 при дубликате) |
| GET | `/admin/professions/{profession_id}` | детали + `skills_count` |
| PATCH | `/admin/professions/{profession_id}` | частичное обновление |
| DELETE | `/admin/professions/{profession_id}` | удалить профессию |
| GET | `/admin/professions/{profession_id}/skills` | связи профессии с навыками |
| PUT | `/admin/professions/{profession_id}/skills` | **полная замена** набора навыков (`position`, `is_core`) |

### Навыки

| Method | Path | Описание |
|--------|------|----------|
| GET | `/admin/skills` | `q`, `category`, `limit` (1..200), `offset` |
| POST | `/admin/skills` | создать |
| GET | `/admin/skills/{skill_id}` | детали |
| PATCH | `/admin/skills/{skill_id}` | частичное обновление |
| DELETE | `/admin/skills/{skill_id}` | удалить (каскадно чистятся связи) |

### Зависимости (с проверкой циклов)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/admin/dependencies` | `skill_id`, `limit` (1..500, по умолчанию 200), `offset` |
| GET | `/admin/dependencies/validate` | проверка всего графа на циклы (диагностика): `200 {"detail": "Циклов не найдено"}` или `409` |
| POST | `/admin/dependencies` | создать связь `prerequisite_id → skill_id` |
| PATCH | `/admin/dependencies/{dependency_id}` | изменить связь (перепроверка только при смене концов) |
| DELETE | `/admin/dependencies/{dependency_id}` | удалить связь |

**Проверка циклов.** При создании/изменении связи проверяется достижимость:
если путь `skill_id → … → prerequisite_id` уже существует, новое ребро замкнёт цикл.

- `422 "Навык не может зависеть от самого себя"` — `skill_id == prerequisite_id`;
- `409 "Связь создаёт цикл в графе навыков"` — цикл;
- `409 "В графе навыков найден цикл: A → B → A"` — ответ `/dependencies/validate`.

Реализация: `app/services/graph.py` (`find_cycle`, `path_exists`, `ensure_edge_is_safe`,
`ensure_graph_has_no_cycles`). Ацикличность обязательна — на ней держатся
топологическая сортировка плана и приоритеты Gap Analysis.

### Ресурсы

| Method | Path | Описание |
|--------|------|----------|
| GET | `/admin/resources` | `skill_id`, `limit` (1..500), `offset` |
| POST | `/admin/resources` | создать ресурс для навыка |
| PATCH | `/admin/resources/{resource_id}` | частичное обновление |
| DELETE | `/admin/resources/{resource_id}` | удалить |

Типы ресурсов: `course`, `book`, `project`, `article`, `video`, `docs`.
Поле `lang` (`ru`/`en`, по умолчанию `ru`) добавлено в неделю 4 — миграция `0006`.

## Что сознательно не реализовано

- **Импорт GitHub / Stepik** — приоритет *Should*: делается после стабилизации MVP,
  эндпоинтов в этой итерации нет.
- Смена цели и удаление аккаунта — *Should*.
- Фильтры карты, бейджи, напоминания, шаринг в соцсети — вне MVP.

## Примеры ответов (схематично)

### Map (`/professions/{id}/map`)
```json
{
  "profession_id": "…",
  "profession_title": "Data Scientist",
  "skills_ready": true,
  "total_skills": 32,
  "mastered_count": 6,
  "learning_count": 1,
  "progress_percent": 18.8,
  "skills": [
    {
      "id": "…",
      "slug": "python-basics",
      "title": "Основы Python",
      "category": "programming",
      "difficulty": 1,
      "layer": 0,
      "estimated_hours": 24,
      "position": 0,
      "is_core": true,
      "required_prerequisites": [],
      "recommended_prerequisites": [
        { "id": "…", "slug": "git-basics", "title": "Git", "dep_type": "recommended" }
      ],
      "user_status": "mastered",
      "self_score": 3,
      "locked": false,
      "resources": [
        {
          "id": "…",
          "title": "Python для начинающих",
          "url": "https://…",
          "resource_type": "course",
          "is_free": true,
          "provider": "Stepik",
          "lang": "ru",
          "estimated_hours": 12
        }
      ]
    }
  ]
}
```

Узлы содержат и `required_prerequisites`, и `recommended_prerequisites` — фронт
строит по ним рёбра React Flow (`prerequisite → skill`).

### Gap (`/me/gap`, `/me/gap/{profession_id}`)
```json
{
  "profession_id": "…",
  "profession_title": "Data Scientist",
  "total_skills": 32,
  "mastered": [
    { "skill": { "slug": "python-basics" }, "status": "mastered", "is_core": true, "position": 0, "locked": false, "priority": 1 }
  ],
  "learning": [
    { "skill": { "slug": "statistics" }, "status": "learning", "is_core": true, "position": 4, "locked": false, "priority": 2 }
  ],
  "missing": [
    { "skill": { "slug": "pandas" }, "status": "not_started", "is_core": true, "position": 9, "locked": true, "priority": 3 }
  ],
  "missing_count": 26,
  "progress_percent": 18.8,
  "estimated_remaining_hours": 552,
  "match_percent": 18.8
}
```

Важные семантики:

- `missing_count = total_skills − len(mastered)` — **включает** навыки в статусе
  `learning` (так считает аналитика: «не освоено» ≠ «не начато»). Отдельно
  `learning` отдаётся списком, а `learning_count` есть в дашборде и публичной ссылке.
- `priority` — порядок из топологической сортировки оставшихся навыков
  (ключ: `self_score` ↑, `layer` ↑, число разблокируемых в профессии ↓, часы ↑, slug).
  `missing` и `learning` используют общий сквозной порядок.
- `match_percent` = `progress_percent` = `round(len(mastered) / total_skills * 100, 1)`.
- `estimated_remaining_hours` считает `learning`-навыки целиком.

### Plan / Trajectory (`/me/plan`, `/me/trajectory/{profession_id}`)
```json
{
  "profession_id": "…",
  "profession_title": "Data Scientist",
  "level": "junior",
  "hours_per_week": 6,
  "total_weeks": 92,
  "current_week": 1,
  "weeks": [
    {
      "week": 1,
      "title": "Неделя 1",
      "focus": "Основы Python",
      "estimated_hours": 6,
      "items": [
        {
          "skill": { "slug": "python-basics" },
          "hours": 6,
          "resources": [{ "title": "…", "url": "…", "resource_type": "course", "lang": "ru" }],
          "status": "planned",
          "item_id": "…",
          "continued": false
        }
      ]
    }
  ],
  "what_to_do_this_week": []
}
```

Неделя заполняется ровно до `hours_per_week`; навык, который не влез целиком,
переносится в следующую неделю с `continued: true`.

### Share
```json
{
  "enabled": true,
  "token": "9f3…",
  "url": "https://app.example.ru/public/9f3…",
  "shared_at": "2026-11-20T10:00:00Z"
}
```

`POST /me/share` идемпотентен: при повторном вызове возвращает существующий токен.
Без выбранной профессии → `409 "Сначала выберите профессию — без неё делиться нечем"`.
`DELETE /me/share` → `{ "enabled": false, "token": null, "url": null, "shared_at": null }`.
`GET /public/{token}` при отключённой или несуществующей ссылке → `404 "Ссылка не найдена"`.
URL строится от `settings.frontend_url` → `{base}/public/{token}`.

### Public map (`/public/{token}`)
```json
{
  "owner_name": "Анна",
  "owner_level": "junior",
  "profession_id": "…",
  "profession_title": "Data Scientist",
  "shared_at": "2026-11-20T10:00:00Z",
  "map": { "…": "как в /professions/{id}/map" },
  "gap": {
    "total_skills": 32,
    "mastered_count": 6,
    "learning_count": 1,
    "missing_count": 26,
    "match_percent": 18.8,
    "estimated_remaining_hours": 552
  },
  "plan": { "hours_per_week": 6, "total_weeks": 92, "current_week": 1, "focus": "Основы Python" }
}
```

Email, `id` пользователя и служебные поля наружу не отдаются.

### Export (`/me/export`)
`GET /me/export?profession_id=…` — по умолчанию берётся цель пользователя.
PDF рендерит **фронт**; бэкенд отдаёт один агрегированный срез:

```json
{
  "meta": { "app": "SkillMap", "version": "2026-11-w4", "generated_at": "…", "share_url": "https://…/public/9f3…" },
  "user": { "name": "Анна", "email": "anna@example.ru", "level": "junior", "hours_per_week": 6, "target_profession_title": "Data Scientist" },
  "profession": { "…": "ProfessionDetail" },
  "map": { "…": "ProfessionMapResponse" },
  "gap": { "…": "GapAnalysisResponse" },
  "plan": { "…": "TrajectoryResponse" },
  "notes": ["Сформировано автоматически в SkillMap"]
}
```

Если цель не выбрана и `profession_id` не передан → `409 "Сначала выберите профессию"`.

---

При реализации придерживайся этих контрактов. Если нужно расширить — обнови этот файл.
