import type {
  ResourceLinkStatus,
  ResourceStatus,
  ResourceType,
} from './types';

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  course: 'Курс',
  book: 'Учебник',
  project: 'Практика',
  article: 'Статья',
  video: 'Видео',
  docs: 'Документация',
};

export const RESOURCE_TYPE_OPTIONS = (
  Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]
).map((value) => ({ value, label: RESOURCE_TYPE_LABELS[value] }));

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  published: 'Опубликован',
  draft: 'Черновик',
  needs_review: 'Нужна проверка',
};

export const RESOURCE_STATUS_OPTIONS = (
  Object.keys(RESOURCE_STATUS_LABELS) as ResourceStatus[]
).map((value) => ({ value, label: RESOURCE_STATUS_LABELS[value] }));

export const RESOURCE_LINK_STATUS_LABELS: Record<ResourceLinkStatus, string> = {
  unknown: 'Ссылка не проверялась',
  ok: 'Ссылка доступна',
  broken: 'Ссылка недоступна',
};

export const RESOURCE_LANG_OPTIONS = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

export const RESOURCE_SORT_OPTIONS = [
  { value: 'skill', label: 'По навыку' },
  { value: 'title', label: 'По названию' },
  { value: 'status', label: 'По статусу' },
  { value: 'updated', label: 'По обновлению' },
];
