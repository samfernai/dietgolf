import Link from "next/link";
import TabBar from "./TabBar";

export default function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-30 bg-masters-500 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href="/play" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-400">
              <span aria-hidden>⛳</span> Diet Golf
            </Link>
            <h1 className="truncate font-display text-xl font-bold leading-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-white/75">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      <TabBar />
    </div>
  );
}
