import { Link } from "@tanstack/react-router";
import { Baby, Feather, UserPlus, Users, Moon, Sparkles, Sun, Waves, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useHydrated, useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFamily } from "@/hooks/useFamily";
import { usePro } from "@/hooks/usePro";

function FamilyChip() {
  const { ready, user, baby, memberCount } = useFamily();
  if (!ready) return null;
  const label = !user ? "Sign in" : !baby ? "Set up baby" : memberCount > 1 ? "Synced with Partner" : "Invite Partner";
  const Icon = baby && memberCount > 1 ? Users : UserPlus;
  return (
    <Link to={user ? "/family" : "/auth"} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold text-secondary-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function HeaderTitle() {
  const { baby } = useFamily();
  const { isPro } = usePro();
  return (
    <p className="flex items-center gap-1.5 font-display text-lg font-bold leading-none">
      <span className="truncate">{baby ? baby.name : "Nestling"}</span>
      {isPro && (
        <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-wider text-primary">
          PRO
        </span>
      )}
    </p>
  );
}

function NestlingLogo() {
  return (
    <Feather
      className="h-7 w-7 shrink-0 text-muted-foreground"
      strokeWidth={1.75}
      aria-hidden="true"
    />
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
            <HeaderTitle />
            <StatusBadge />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FamilyChip />
          <ThemeToggle />
        </div>
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
