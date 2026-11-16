import Link from "next/link";
import { ROUTES } from "@/shared/config";

export function ContinueLink({ href = ROUTES.trajectory }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white"
    >
      → Продолжить
    </Link>
  );
}
