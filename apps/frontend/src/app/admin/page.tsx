import Link from 'next/link';
import { AdminShell } from '@/widgets/admin-shell';

export const metadata = {
  title: 'Админка — SkillMap',
};

export default function AdminHomePage() {
  return (
    <AdminShell breadcrumb={['Редакторская', 'Обзор']}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-h2 text-text">Обзор редакторской</h1>
        <p className="mt-2 text-body text-secondary">
          Управляйте контентом профессий и публикуйте карты навыков.
        </p>
        <Link
          href="/admin/graph"
          className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          Открыть редактор графа →
        </Link>
      </div>
    </AdminShell>
  );
}
