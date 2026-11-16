import { GapAnalysisPage } from '@/widgets/gap';

export const metadata = {
  title: 'Gap Analysis — SkillMap',
  description:
    'Сравнение ваших навыков с требованиями профессии: пробелы, приоритеты и оценка времени.',
};

export default function GapRoute() {
  return <GapAnalysisPage />;
}