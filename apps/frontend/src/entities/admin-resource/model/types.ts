/** Типы редакторской страницы «Ресурсы» (см. app/api/v1/endpoints/admin.py). */

export type ResourceType =
  | 'course'
  | 'book'
  | 'project'
  | 'article'
  | 'video'
  | 'docs';

export type ResourceStatus = 'draft' | 'published' | 'needs_review';

export type ResourceLinkStatus = 'unknown' | 'ok' | 'broken';

export type ResourceSortField = 'skill' | 'title' | 'status' | 'updated';

export type SortDirection = 'asc' | 'desc';

/** GET /admin/resources — элемент списка. */
export type AdminResource = {
  id: string;
  skillId: string;
  skillSlug: string;
  skillTitle: string;
  title: string;
  url: string;
  resourceType: ResourceType;
  isFree: boolean;
  provider: string;
  lang: string;
  description: string;
  estimatedHours: number | null;
  position: number;
  status: ResourceStatus;
  linkStatus: ResourceLinkStatus;
  lastCheckedAt: string | null;
  publishedAt: string | null;
};

export type AdminResourceList = {
  items: AdminResource[];
  total: number;
  limit: number;
  offset: number;
};

/** GET /admin/resources/stats */
export type AdminResourceStats = {
  total: number;
  published: number;
  draft: number;
  needsReview: number;
  brokenLinks: number;
  uncheckedLinks: number;
  skillsTotal: number;
  skillsWithResources: number;
  professionId: string | null;
};

/** POST /admin/resources/check-links */
export type AdminResourceLinkCheckResult = {
  checked: number;
  ok: number;
  broken: number;
  items: AdminResource[];
};

export type AdminResourceListParams = {
  q?: string;
  skillId?: string;
  professionId?: string;
  resourceType?: ResourceType;
  lang?: string;
  isFree?: boolean;
  status?: ResourceStatus;
  linkStatus?: ResourceLinkStatus;
  sortBy?: ResourceSortField;
  sortDir?: SortDirection;
  limit?: number;
  offset?: number;
};

export type AdminResourceCreate = {
  skillId: string;
  title: string;
  url?: string;
  resourceType?: ResourceType;
  isFree?: boolean;
  provider?: string;
  lang?: string;
  description?: string;
  estimatedHours?: number | null;
  position?: number;
  status?: ResourceStatus;
};

/** PATCH /admin/resources/{id} — любое подмножество полей. */
export type AdminResourceUpdate = Partial<AdminResourceCreate>;

export type AdminResourceLinkCheckParams = {
  professionId?: string;
  skillId?: string;
  onlyUnchecked?: boolean;
  limit?: number;
};

/** Черновик формы в боковой панели (не привязан к ответу API). */
export type AdminResourceDraft = {
  skillId: string;
  title: string;
  url: string;
  resourceType: ResourceType;
  isFree: boolean;
  provider: string;
  lang: string;
  description: string;
  estimatedHours: string;
  position: string;
  status: ResourceStatus;
};
