import { Link } from "@tanstack/react-router";
import { Baby, Moon, Sparkles, Sun, Waves, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useHydrated, useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function NestlingLogo() {
  return (
    <span
      className="relative inline-flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full bg-logo shadow-sm"
      role="img"
      aria-label="Nestling logo"
    >
      <svg viewBox="0 0 100 100" fill="none" className="h-[70%] w-[70%] stroke-logo-ink" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 28 72 C 22 62 20 46 26 34 C 28 29 33 24 38 27 C 42 30 38 38 36 44 C 33 52 35 62 42 68" strokeWidth="5" />
        <path d="M 33 34 C 36 29 42 27 45 32 C 48 37 43 45 40 52 C 38 58 41 64 47 67" strokeWidth="4" />
        <path d="M 44 76 C 58 78 72 74 76 60 C 80 48 76 32 72 24 C 69 19 64 21 64 26 C 64 34 68 45 64 54 C 60 62 50 66 42 66" strokeWidth="5" />
        <path d="M 64 29 C 61 25 56 27 56 32 C 56 40 60 48 57 56" strokeWidth="4" />
        <path d="M 50 49 C 48 45 43 46 43 50 C 43 54 50 60 50 60 C 50 60 57 54 57 50 C 57 46 52 45 50 49 Z" className="fill-logo-amber-dark" stroke="none" />
      </svg>
    </span>
  );
}

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
    <Button
      type="button"
      variant="secondary"
      onClick={toggle}
      aria-label="Toggle night mode"
      className="h-10 w-10 rounded-full p-0 active:bg-muted"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
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
  { to: "/", label: "Tracker", icon: Baby },
  { to: "/sounds", label: "Sounds", icon: Waves },
  { to: "/ask", label: "Nanny AI", icon: Sparkles },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-40 isolate flex items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 py-3 shadow-soft backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
        <div className="flex min-w-0 items-center gap-3">
          <NestlingLogo />
          <div className="flex min-w-0 flex-col items-start justify-center gap-1">
            <p className="font-display text-lg font-bold leading-none">Nestling</p>
            <StatusBadge />
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-0 flex-1 px-4 pb-28 pt-4">{children}</main>

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
