import type { ProfessionMap } from '@/entities/skill';

/** Состояние узла в редакторе — приходит с бэкенда (`publish_state`). */
export type PublishStatus = 'draft' | 'published' | 'modified' | 'new';

export type ProfessionStatus = 'draft' | 'published';

export type ProfessionLevel = 'beginner' | 'intermediate' | 'advanced';

/** Тип зависимости: `skillId` требует `prerequisiteId`. */
export type DependencyType = 'required' | 'recommended';

/** GET /admin/professions — элемент списка профессий. */
export type AdminProfession = {
  id: string;
  slug: string;
  title: string;
  direction: string;
  shortDescription: string;
  status: ProfessionStatus;
  entryLevel: ProfessionLevel | null;
  skillsReady: boolean;
  skillsCount: number;
  estimatedWeeks: number;
  publishedAt: string | null;
  contentVersion: number;
  publishedByName: string;
  /** Когда редактор последний раз менял контент профессии (для «черновик сохранён»). */
  draftSavedAt: string | null;
};

export type AdminProfessionList = {
  items: AdminProfession[];
  total: number;
  limit: number;
  offset: number;
};

/** GET /admin/professions — фильтры списка. */
export type AdminProfessionListParams = {
  q?: string;
  status?: ProfessionStatus;
  entryLevel?: ProfessionLevel;
  limit?: number;
  offset?: number;
};

/** Узел графа: навык + позиция в профессии + состояние публикации. */
export type AdminGraphNode = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  difficulty: number;
  layer: number;
  estimatedHours: number | null;
  position: number;
  isCore: boolean;
  posX: number | null;
  posY: number | null;
  publishState: PublishStatus;
  resourcesCount: number;
};

/** Ребро графа: `skillId` зависит от `prerequisiteId`. */
export type AdminGraphEdge = {
  id: string;
  skillId: string;
  prerequisiteId: string;
  depType: DependencyType;
};

export type AdminGraphStats = {
  skills: number;
  required: number;
  recommended: number;
  layers: number;
  resources: number;
  modified: number;
};

/** GET /admin/professions/{id}/graph */
export type AdminProfessionGraph = {
  professionId: string;
  slug: string;
  title: string;
  status: ProfessionStatus;
  skillsReady: boolean;
  contentVersion: number;
  publishedAt: string | null;
  publishedByName: string;
  updatedAt: string | null;
  hasUnpublishedChanges: boolean;
  nodes: AdminGraphNode[];
  edges: AdminGraphEdge[];
  stats: AdminGraphStats;
};

export type AdminSkillInput = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  difficulty: number;
  layer: number;
  estimatedHours: number | null;
};

/** POST /admin/professions/{id}/skills — новый навык сразу в графе профессии. */
export type AdminGraphSkillCreate = {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  difficulty?: number;
  estimatedHours?: number | null;
  posX?: number | null;
  posY?: number | null;
  isCore?: boolean;
};

/** PATCH /admin/skills/{id} — любое подмножество полей навыка. */
export type AdminSkillPatch = Partial<AdminSkillInput> & {
  slug?: string;
};

/** GET /admin/skills — элемент справочника навыков. */
export type AdminSkill = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  difficulty: number;
  layer: number;
  estimatedHours: number | null;
  posX: number | null;
  posY: number | null;
  professions: string[];
};

export type AdminSkillList = {
  items: AdminSkill[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminDependency = {
  id: string;
  skillId: string;
  skillSlug: string;
  skillTitle: string;
  prerequisiteId: string;
  prerequisiteSlug: string;
  prerequisiteTitle: string;
  depType: DependencyType;
};

export type AdminDependencyList = {
  items: AdminDependency[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * GET /admin/dependencies/broken — связь, которую не видно на карте:
 * второй конец вне профессии (`outside_profession`) или связь не попадает
 * ни в одну карту (`orphan`).
 */
export type BrokenDependency = {
  id: string;
  skillId: string;
  skillTitle: string;
  prerequisiteId: string;
  prerequisiteTitle: string;
  reason: 'outside_profession' | 'orphan';
  reasonText: string;
};

export type BrokenDependencyList = {
  items: BrokenDependency[];
  total: number;
  limit: number;
  offset: number;
};

export type BrokenDependencyListParams = {
  professionId?: string;
  limit?: number;
  offset?: number;
};

export type AdminPublishResult = {
  professionId: string;
  status: ProfessionStatus;
  contentVersion: number;
  publishedAt: string | null;
  publishedByName: string;
};

/** GET /admin/professions/{id}/preview — черновик карты глазами студента. */
export type AdminProfessionPreview = {
  status: ProfessionStatus;
  contentVersion: number;
  publishedAt: string | null;
  map: ProfessionMap;
};

export type AdminMessage = { detail: string };

/** POST /admin/professions */
export type AdminProfessionCreate = {
  slug: string;
  title: string;
  direction?: string;
  shortDescription?: string;
  entryLevel?: ProfessionLevel | null;
};

/** PATCH /admin/professions/{id} */
export type AdminProfessionUpdate = {
  slug?: string;
  title?: string;
  direction?: string;
  shortDescription?: string;
  entryLevel?: ProfessionLevel | null;
  status?: ProfessionStatus;
};
