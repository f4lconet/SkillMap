import { Button } from '@/shared/ui/button/Button';

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 3.333v9.334M3.333 8h9.334"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  onCreate: () => void;
  creating?: boolean;
};

export function ResourcesHeader({ onCreate, creating = false }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-accent uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Редакторская · База знаний
        </div>
        <h1 className="text-h2 tracking-tight text-text">Ресурсы и соответствия</h1>
        <p className="mt-1.5 max-w-xl text-sm text-secondary">
          Поддерживайте учебные материалы в актуальном состоянии и связывайте их
          с навыками.
        </p>
      </div>
      <Button
        variant="primary"
        leftIcon={<PlusIcon />}
        onClick={onCreate}
        disabled={creating}
      >
        Добавить ресурс
      </Button>
    </div>
  );
}
