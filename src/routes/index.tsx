import { createFileRoute } from "@tanstack/react-router";
import { QuickActions } from "@/components/tracker/QuickActions";
import { DailySummary } from "@/components/tracker/DailySummary";
import { Timeline } from "@/components/tracker/Timeline";
import { ExportPdfButton } from "@/components/tracker/ExportPdfButton";
import { useHydrated } from "@/hooks/useOnline";
import { Link } from "@tanstack/react-router";
import { useFamily } from "@/hooks/useFamily";

function SyncBanner() {
  const { ready, user, baby } = useFamily();
  if (!ready || (user && baby)) return null;
  return (
    <Link to={user ? "/family" : "/auth"} className="mb-4 block rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft">
      <span className="font-semibold">{user ? "Create or join a baby profile" : "Sign in to sync"}</span>
      <span className="block text-muted-foreground">{user ? "Share logs with your partner in real time." : "Back up your logs and share them across phones."}</span>
    </Link>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tracker — Nestling" },
      {
        name: "description",
        content:
          "One-tap feed, diaper and sleep tracking for new parents. Works fully offline on your phone.",
      },
      { property: "og:title", content: "Tracker — Nestling" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "One-tap feed, diaper and sleep tracking that works fully offline.",
      },
    ],
  }),
  component: TrackerPage,
});

function TrackerPage() {
  const hydrated = useHydrated();

  return (
    <div>
      {hydrated && <SyncBanner />}
      {hydrated && <DailySummary />}
      {hydrated && <ExportPdfButton />}
      <QuickActions />
      {hydrated ? (
        <Timeline />
      ) : (
        <div className="mt-6 h-24 animate-pulse rounded-2xl bg-muted/60" />
      )}
    </div>
  );
}
