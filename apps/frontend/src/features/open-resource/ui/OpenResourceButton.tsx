interface Props {
  /** Ссылка на ресурс из API; если её нет — кнопка остаётся неактивной. */
  href?: string;
  label?: string;
}

export function OpenResourceButton({ href, label = "Открыть ресурс" }: Props) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-4 inline-block text-sm font-medium text-accent"
      >
        {label}
      </a>
    );
  }

  return (
    <button type="button" className="mt-4 text-sm font-medium text-accent">
      {label}
    </button>
  );
}
