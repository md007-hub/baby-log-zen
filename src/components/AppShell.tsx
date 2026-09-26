import { Link } from "@tanstack/react-router";
import { Baby, Moon, Sparkles, Sun, Waves, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useHydrated, useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function NestlingLogo() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-logo shadow-soft" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="h-8 w-8" role="img">
        <path className="fill-logo-sage" d="M7 22.6c3.1 1 5.5 2.6 7.3 4.8 1.5 1.9 3.5 3.2 5.7 3.8-5.7 1.3-11.1-.8-14.4-5.8-.8-1.3-.2-3.2 1.4-2.8Z" />
        <path className="fill-logo-sage" d="M33 22.6c-3.1 1-5.5 2.6-7.3 4.8-1.5 1.9-3.5 3.2-5.7 3.8 5.7 1.3 11.1-.8 14.4-5.8.8-1.3.2-3.2-1.4-2.8Z" />
        <path className="fill-logo-amber" d="M13 23.2c.7-5.7 3.4-10.4 8-14.2.4 3.2 2 5.2 4.8 6.2 3.5 1.2 5 3.5 4.3 6.8-.7 3.6-4.1 6.1-9 6.1-3.5 0-6.2-1.7-8.1-4.9Z" />
        <path className="fill-logo-cream" d="M18.1 21.8c1.3-3 3.6-4.6 7-4.9-1.7 1.4-2.7 3.3-3.1 5.8l-3.9-.9Z" />
        <circle className="fill-logo-ink" cx="25.7" cy="19.7" r="1" />
        <path className="fill-logo-amber-dark" d="m29.4 19.8 4.5 1.7-4.5 1.4Z" />
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
