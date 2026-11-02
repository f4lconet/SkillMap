# 02. Доменная модель

## Основные сущности

### User (Студент / Редактор)
- id, email, password_hash (или OAuth)
- name
- role: `student` | `editor` | `admin`
- target_profession_id (nullable)
- level: `beginner` | `intermediate` | `advanced`
- hours_per_week: int
- public_share_token (nullable)
- public_share_enabled: bool
- created_at, updated_at

### Profession
- id, slug, title, description
- direction (категория: Разработка, Аналитика, Дизайн, Управление…)
- is_published: bool
- estimated_skills_count, estimated_weeks (для карточки каталога)
- created_at, updated_at

### Skill
- id, slug, title, description
- complexity: 1–5 (или beginner/intermediate/advanced)
- estimated_hours: int
- type (optional: hard/soft/tool)
- created_at, updated_at

### ProfessionSkill (связь many-to-many)
- profession_id, skill_id
- is_required: bool
- order_hint (optional)

### SkillDependency
- id
- skill_id (dependent)
- prerequisite_skill_id
- **Важно:** граф не должен содержать циклов. При сохранении — валидация.

### UserSkill
- user_id, skill_id
- status: `not_started` | `in_progress` | `mastered` | `skipped`
- level: 0–3 (0 = не знает, 3 = уверенно)
- source: `manual` | `github` | `stepik` | …
- updated_at

### Resource
- id, title, url, type (`course` | `book` | `project` | `article` | `video`)
- is_free: bool
- provider (Stepik, Coursera, YouTube…)
- skill_id (привязка)

### Plan / PlanItem
- Plan: user_id, profession_id, generated_at, hours_per_week
- PlanItem: plan_id, skill_id, week_number, estimated_hours, resources[], status

### PublicShare
- token, user_id, enabled, created_at

---

## Статусы узлов на карте (UI + логика)

| Статус | Условие | Цвет (UI-kit) |
|--------|---------|---------------|
| `mastered` | UserSkill.status = mastered | success / success-soft |
| `in-progress` | UserSkill.status = in_progress | accent / accent-soft (dashed) |
| `available` | все prerequisites mastered (или нет prerequisites) | surface + border |
| `locked` | есть незакрытые prerequisites | page + secondary, opacity |
| `selected` | текущий выбранный узел | accent (заливка) |

**Подсветка «следующего шага»:** узлы со статусом `available`, у которых все prerequisites = mastered.

---

## Алгоритмы (backend services)

### Gap Analysis
1. Взять все Skills профессии.
2. Сравнить с UserSkill пользователя.
3. Вернуть:
   - mastered: [{skill, level, source}]
   - missing: [{skill, priority}]  (priority по топологическому порядку / важности)
   - match_percent: float

### Генерация траектории
1. Взять missing skills.
2. Топологическая сортировка с учётом SkillDependency.
3. Разбить по неделям с учётом `hours_per_week` и `estimated_hours` навыка.
4. Привязать Resources.
5. Сформировать Plan + PlanItems.
6. Блок «Что делать на этой неделе» = PlanItems текущей недели.

### Пересчёт
При любом изменении UserSkill или hours_per_week → пересчитать Gap + Plan (или инвалидировать кэш).

---

## Валидации

- Email уникален.
- Пароль ≥ 8 символов.
- hours_per_week > 0.
- При добавлении SkillDependency — проверка на цикл (DFS / topological).
- Публичный токен — уникальный, достаточный длины.
