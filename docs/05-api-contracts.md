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
| 409 | конфликт: дубликат slug (в т.ч. любое нарушение уникальности в БД), связь создаёт **цикл** в графе |
| 422 | ошибка валидации тела/параметров, зависимость навыка от самого себя, выход за границы пагинации, не-http(s) URL ресурса |
| 429 | внешний сервис (GitHub/Stepik) ограничил частоту запросов |
| 502 / 503 | внешний сервис ответил ошибкой или недоступен |

### Пагинация

Все списки используют `limit` + `offset` с жёсткими границами (FastAPI отдаёт `422`
при выходе за них). Границы — единый источник правды `app/api/pagination.py`.

| Группа | `limit` | По умолчанию | `offset` |
|--------|---------|--------------|----------|
| `/professions` (публичный каталог) | 1..50 | 20 | 0..10000 |
| `/admin/professions`, `/admin/skills`, `/admin/dependencies`, `/admin/resources` | 1..200 | 50 | 0..10000 |

Сервисы дополнительно «подрезают» параметры (`clamp_page`), поэтому даже внутренний
вызов не может запросить больше 200 записей за раз.

### Конфликты и целостность

`409` на дубликат выдаётся в двух местах: сервис (`_commit` в `app/services/admin.py`)
отлавливает `IntegrityError`, откатывает транзакцию и возвращает понятное сообщение, а
глобальный обработчик в `app/main.py` страхует всё, что проскочило мимо сервисов.
Фронт может рассчитывать на `409`, а не на `500`.


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
| GET | `/professions` | каталог: `q`, `direction`, `limit` (1..50, по умолчанию 20), `offset` |
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

### Импорт навыков (Should, неделя 5)

Импорт двухшаговый: сначала `preview` показывает подсказки с доказательствами,
затем `apply` записывает **только выбранные** навыки. `preview` ничего не меняет,
поэтому импорт не может незаметно переписать прогресс онбординга.

| Method | Path | Описание |
|--------|------|----------|
| POST | `/me/import/github/preview` | `login` (можно с `@`), опционально `profession_id` |
| POST | `/me/import/stepik/preview` | `course_ids` (1..50), опционально `profession_id` |
| POST | `/me/import/apply` | `skill_ids` (1..100), `source` (`github`/`stepik`), `self_score` |

```json
{
  "source": "github",
  "account": "octocat",
  "total_signals": 7,
  "suggestions": [
    {
      "skill_id": "…",
      "slug": "py-basics",
      "title": "Основы Python",
      "confidence": 0.85,
      "evidence": [
        { "source": "github", "title": "Python", "url": "https://github.com/octocat", "confidence": 0.85 }
      ]
    }
  ],
  "unmatched": ["Go"],
  "already_mastered": ["git-cli"]
}
```

Ответ `apply`:

```json
{
  "source": "github",
  "applied": [{ "skill_id": "…", "slug": "py-basics" }],
  "total_mastered": 7
}
```

Особенности:

- `preview` без выбранной профессии сопоставляет со **всеми** навыками; с
  `profession_id` (или целью пользователя) — только с навыками этой профессии.
- `unmatched` — сигналы, которым не нашлось навыка. Показываются пользователю как
  есть; ничего не подставляется угадыванием (например, язык `Go` в контенте
  отсутствует и остаётся в `unmatched`).
- Уверенность считается по схеме noisy-OR (`1 - Π(1 - c_i)`), поэтому несколько
  независимых сигналов по одному навыку дают больший вес.
- `apply` идемпотентен: повторный вызов не создаёт дубликатов, `UserSkill.source`
  фиксирует происхождение навыка (`github`/`stepik`, `null` — вручную).
- GitHub читается из публичного API (без токена). Если задан
  `GITHUB_IMPORT_TOKEN`, лимит поднимается с 60 до 5000 запросов в час.
  При превышении лимита — `429 "GitHub ограничил частоту запросов…"`.
- `404` — профиль GitHub или курсы Stepik не найдены; `503` — сервис недоступен.

Маппинг — `app/services/import_mapping.py` (чистые функции, без сети), запросы —
`app/services/importers.py`, роуты — `app/api/v1/endpoints/imports.py`.

## Public (без auth)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/public/u/{username}` | read-only карта + Gap + план по имени пользователя (**каноническая** ссылка) |
| GET | `/public/{token}` | то же по legacy-токену (ссылки, выданные ранее) |

## Admin (editor/admin)

Все роуты `/admin/*` требуют роль `EDITOR` (`Depends(require_role(UserRole.EDITOR))`),
иначе `403 {"detail": "Недостаточно прав"}`. `GET /admin/ping` — дешёвая проверка прав.

### Профессии

| Method | Path | Описание |
|--------|------|----------|
| GET | `/admin/professions` | `q`, `status` (alias для `status_filter`), `entry_level` (`beginner`/`intermediate`/`advanced`), `limit` (1..200, по умолчанию 50), `offset` |
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
| GET | `/admin/dependencies` | `skill_id`, `limit` (1..200, по умолчанию 50), `offset` |
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
| GET | `/admin/resources` | `skill_id`, `link_status` (`unknown`/`ok`/`broken`), `limit` (1..200, по умолчанию 50), `offset` |
| POST | `/admin/resources/check-links` | пакетная проверка доступности ссылок (`limit` из той же шкалы) |
| POST | `/admin/resources` | создать ресурс для навыка |
| PATCH | `/admin/resources/{resource_id}` | частичное обновление |
| DELETE | `/admin/resources/{resource_id}` | удалить |

Типы ресурсов: `course`, `book`, `project`, `article`, `video`, `docs`.
Поле `lang` (`ru`/`en`, по умолчанию `ru`) добавлено в неделю 4 — миграция `0006`.

**Валидация URL.** `url` ресурса проверяется на схему `http`/`https` (тип
`ResourceUrl` в `app/schemas/admin.py`). Значения вида `javascript:…` или пустая
строка отклоняются с `422`, а не роняют редактор в `500`.

### Обзор редакторской и журнал (неделя 6)

Страница «Обзор» (`/admin`) собирает счётчики, чек-лист и последние изменения
одним запросом — без «водопада» запросов при открытии.

| Method | Path | Описание |
|--------|------|----------|
| GET | `/admin/overview` | сводка по профессии: `profession_id` (без него — приоритетная профессия), `recent_limit` (0..50, по умолчанию 5) |
| GET | `/admin/history` | журнал изменений: `profession_id`, `skill_id`, `entity_type`, `action`, `limit`, `offset` |
| GET | `/admin/dependencies/broken` | связи, невидимые на карте: `profession_id` (без него — невидимые нигде), `limit`, `offset` |

**`GET /admin/overview`** вернёт:

- `profession` — карточка профессии (`content_version`, `published_at`,
  `published_by_name`, `draft_saved_at`); `null`, если профессий ещё нет;
- `has_unpublished_changes` — есть ли черновик относительно последней публикации;
- `stats` — плитки KPI: `skills`, `dependencies`, `resources`, `attention`,
  `required`, `recommended`, `layers`, `published_resources`, `draft_resources`,
  `needs_review_resources`, `broken_links`;
- `checklist` — чек-лист перед публикацией: `graph_ready`, `resources_ready`,
  `links_ready`, `skills_without_resources`, `broken_dependencies`,
  `unchecked_links`, `cycle` (навыки, образующие цикл);
- `attention` — ресурсы, требующие проверки (`ResourceAdminRead[]`);
- `skills_without_resources` — навыки без единого материала (`GraphNodeRead[]`);
- `recent` — последние записи журнала по этой профессии (`AdminEventRead[]`).

**`GET /admin/history`** — записи вида `{id, created_at, actor_id, actor_name,
entity_type, entity_id, profession_id, skill_id, action, title, detail}` с
разбивкой `{items, total, limit, offset}`. `entity_type` — `profession` | `skill` |
`dependency` | `resource`, `action` — `created` | `updated` | `deleted` |
`published` | `checked`. Фильтр `profession_id` включает и события навыков этой
профессии.

**`GET /admin/dependencies/broken`** — `{id, skill_id, skill_title,
prerequisite_id, prerequisite_title, reason, reason_text}`, где `reason` —
`outside_profession` (второй конец связи вне профессии) или `orphan` (ребро не
видно ни на одной карте). Редактор графа рисует ребро только когда оба конца
входят в профессию — такие связи иначе терялись бы молча.

**Журнал.** Каждая мутация в админке пишет запись в `admin_events` в той же
транзакции (модель `app/models/activity.py`, логика —
`app/services/admin_activity.py`). `entity_id` без внешнего ключа: запись должна
переживать удаление сущности. Запись также обновляет `professions.draft_saved_at`
(«черновик сохранён» в шапке редактора).

## Что сознательно не реализовано

- Смена цели и удаление аккаунта — *Should*.
- Фильтры карты, бейджи, напоминания, шаринг в соцсети — вне MVP.

## Контент профессий (неделя 5)

Контент живёт в `apps/backend/data/skillmap_content.json` и загружается
`app/scripts/seed.py`. Перед записью в БД выполняется валидация
(`app/services/content_validation.py`): дубликаты slug, неизвестные профессии и
навыки, циклы в зависимостях, навыки без ресурсов и т.п. При ошибке сид падает с
отчётом и **ничего не пишет**.

Отдельный CLI для аналитика (не требует БД):

```bash
uv run python -m app.scripts.validate_content            # отчёт по data/skillmap_content.json
uv run python -m app.scripts.validate_content --json     # машиночитаемо для CI
uv run python -m app.scripts.validate_content --warnings-as-errors
```

Код возврата `1` — есть ошибки. Повторный сид не разрушает ручные правки в админке:
`status`/`entry_level` профессий, `is_core` связей и `status` ресурсов
выставляются только для новых записей.

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
  "username": "anna",
  "token": "9f3…",
  "profile_url": "https://app.example.ru/u/anna",
  "url": "https://app.example.ru/public/9f3…",
  "shared_at": "2026-11-20T10:00:00Z"
}
```

`POST /me/share` идемпотентен: при повторном вызове возвращает существующую ссылку.
Без выбранной профессии → `409 "Сначала выберите профессию — без неё делиться нечем"`.
`DELETE /me/share` → `{ "enabled": false, "username": null, "token": null, "profile_url": null, "url": null, "shared_at": null }`.
`GET /public/u/{username}` при отключённой ссылке → `404 "Ссылка не найдена"`.

**Каноническая ссылка — `/u/{username}`** (`profile_url`): она человекочитаемая и
не ломается при перевыпуске токена. `url` (`/public/{token}`) остаётся для
совместимости со ссылками, выданными ранее. Обе строятся от `settings.frontend_url`.

### Public map (`/public/u/{username}`, `/public/{token}`)
```json
{
  "username": "anna",
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
  "meta": { "app": "SkillMap", "version": "2026-11-w5", "generated_at": "…", "share_url": "https://…/u/anna" },
  "user": { "name": "Анна", "email": "anna@example.ru", "level": "junior", "hours_per_week": 6, "target_profession_title": "Data Scientist" },
  "profession": { "…": "ProfessionDetail" },
  "map": { "…": "ProfessionMapResponse" },
  "gap": { "…": "GapAnalysisResponse" },
  "plan": { "…": "TrajectoryResponse" },
  "notes": ["Сформировано автоматически в SkillMap"]
}
```

Если цель не выбрана и `profession_id` не передан → `409 "Сначала выберите профессию"`.

`meta.version` — версия контракта экспорта, текущая `2026-11-w5`. Фронт сверяет её,
чтобы PDF не поехал при изменении схемы. `meta.share_url` — `null`, пока публичная
ссылка не включена, иначе канонический `/u/{username}`.

---

При реализации придерживайся этих контрактов. Если нужно расширить — обнови этот файл.
