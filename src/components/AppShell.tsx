import { Link } from "@tanstack/react-router";
import { Feather, Moon, Sparkles, Sun, Waves, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useHydrated, useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nursery-theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nursery-theme", next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle night mode"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors active:bg-muted"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function StatusBadge() {
  const hydrated = useHydrated();
  const online = useOnline();
  const showOnline = !hydrated || online;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
        showOnline ? "bg-online/15 text-online" : "bg-offline/20 text-offline",
      )}
    >
      {showOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {showOnline ? "Online" : "Offline (Saving locally)"}
    </span>
  );
}

const tabs = [
  { to: "/", label: "Tracker", icon: Feather },
  { to: "/sounds", label: "Sounds", icon: Waves },
  { to: "/ask", label: "Nanny AI", icon: Sparkles },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <Feather className="h-6 w-6 text-muted-foreground" strokeWidth={2} />
          <div>
            <p className="font-display text-lg font-bold leading-tight">Nestling</p>
            <StatusBadge />
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="grid grid-cols-3">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
