import { MobileNav } from "./mobile-nav";

export function Header() {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card/50 backdrop-blur-sm px-6 md:px-8">
      <MobileNav />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-medium text-muted-foreground">System active</span>
      </div>
    </header>
  );
}
