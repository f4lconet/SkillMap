import Link from "next/link";
import type { Metric } from "../model/types";

const CARD = "block rounded-2xl border border-border bg-white p-5 transition-colors";

export function MetricCard({ title, value, hint, tone = "default", href }: Metric) {
  const hintClass = tone === "positive" ? "text-success" : "text-secondary";
  const body = (
    <>
      <p className="text-sm text-secondary">{title}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
      <p className={`mt-1 text-sm ${hintClass}`}>{hint}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${CARD} hover:border-accent/40`}>
        {body}
      </Link>
    );
  }

  return <section className={CARD}>{body}</section>;
}
