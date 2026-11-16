/** Текущая дата в виде «Понедельник, 16 ноября». */
export function formatToday(): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Число в русской локали: 9.4 → «9,4». */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value)}%`;
}

export function formatHours(value: number): string {
  return `${formatNumber(value)} ч`;
}

const SKILL_FORMS: [string, string, string] = ['навык', 'навыка', 'навыков'];

/** Склонение слова «навык» по числу: 1 навык, 2 навыка, 5 навыков. */
export function pluralSkills(count: number): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;

  if (mod10 === 1 && mod100 !== 11) return SKILL_FORMS[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return SKILL_FORMS[1];
  return SKILL_FORMS[2];
}
