import type { AdminResource, AdminResourceDraft } from './types';

export const EMPTY_RESOURCE_DRAFT: AdminResourceDraft = {
  skillId: '',
  title: '',
  url: '',
  resourceType: 'course',
  isFree: true,
  provider: '',
  lang: 'ru',
  description: '',
  estimatedHours: '',
  position: '0',
  status: 'draft',
};

export function resourceToDraft(resource: AdminResource): AdminResourceDraft {
  return {
    skillId: resource.skillId,
    title: resource.title,
    url: resource.url,
    resourceType: resource.resourceType,
    isFree: resource.isFree,
    provider: resource.provider,
    lang: resource.lang,
    description: resource.description,
    estimatedHours:
      resource.estimatedHours === null ? '' : String(resource.estimatedHours),
    position: String(resource.position),
    status: resource.status,
  };
}

export function parseHours(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function parsePosition(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}
