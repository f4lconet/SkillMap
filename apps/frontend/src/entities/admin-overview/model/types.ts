/**
 * Сводка стартовой страницы админки (`GET /admin/overview`).
 *
 * Один ответ собирает срез графа профессии, статистику ресурсов и последние
 * изменения, поэтому типы живут отдельным слайсом и переиспользуют
 * `admin-graph`, `admin-resource` и `admin-event`.
 */

import type { AdminEvent } from '@/entities/admin-event';
import type { AdminGraphNode, AdminProfession } from '@/entities/admin-graph';
import type { AdminResource } from '@/entities/admin-resource';

/** Плитки KPI. */
export type AdminOverviewStats = {
  skills: number;
  dependencies: number;
  resources: number;
  /** Навыки без материалов + битые связи + ресурсы на проверке. */
  attention: number;
  required: number;
  recommended: number;
  layers: number;
  publishedResources: number;
  draftResources: number;
  needsReviewResources: number;
  brokenLinks: number;
};

/** Три пункта чек-листа «Проверка перед публикацией». */
export type AdminOverviewChecklist = {
  graphReady: boolean;
  resourcesReady: boolean;
  linksReady: boolean;
  skillsWithoutResources: number;
  brokenDependencies: number;
  uncheckedLinks: number;
  /** Навыки, образующие цикл зависимостей (пусто, если циклов нет). */
  cycle: string[];
};

export type AdminOverview = {
  profession: AdminProfession | null;
  hasUnpublishedChanges: boolean;
  stats: AdminOverviewStats;
  checklist: AdminOverviewChecklist;
  /** Ресурсы на проверке или с недоступной ссылкой. */
  attention: AdminResource[];
  /** Навыки профессии без единого материала. */
  skillsWithoutResources: AdminGraphNode[];
  /** Последние изменения контента профессии. */
  recent: AdminEvent[];
};

export type AdminOverviewParams = {
  professionId?: string;
  /** Сколько последних изменений вернуть (0 — без ленты). */
  recentLimit?: number;
};
