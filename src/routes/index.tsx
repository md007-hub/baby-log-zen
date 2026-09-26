import { createFileRoute } from "@tanstack/react-router";
import { QuickActions } from "@/components/tracker/QuickActions";
import { Timeline } from "@/components/tracker/Timeline";
import { useHydrated } from "@/hooks/useOnline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tracker — NurseryShift" },
      {
        name: "description",
        content:
          "One-tap feed, diaper and sleep tracking for new parents. Works fully offline on your phone.",
      },
      { property: "og:title", content: "Tracker — NurseryShift" },
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
      <QuickActions />
      {hydrated ? (
        <Timeline />
      ) : (
        <div className="mt-6 h-24 animate-pulse rounded-2xl bg-muted/60" />
      )}
    </div>
  );
}
