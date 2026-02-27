import { MobileNav } from "./mobile-nav";

export function Header() {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6 md:px-8">
      <MobileNav />
      <div className="flex-1" />
      <span className="text-xs text-muted-foreground">IA-Ops Log Analyzer</span>
    </header>
  );
}
