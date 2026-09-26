import { createFileRoute } from "@tanstack/react-router";
import { SoundPlayer } from "@/components/SoundPlayer";
import { useHydrated } from "@/hooks/useOnline";

export const Route = createFileRoute("/sounds")({
  head: () => ({
    meta: [
      { title: "Soothing Sounds — NurseryShift" },
      {
        name: "description",
        content:
          "White, pink and brown noise generated right on your phone, with 15, 30 and 60 minute sleep timers.",
      },
      { property: "og:title", content: "Soothing Sounds — NurseryShift" },
      {
        property: "og:description",
        content: "White, pink and brown noise with sleep timers — no downloads, works offline.",
      },
    ],
  }),
  component: SoundsPage,
});

function SoundsPage() {
  const hydrated = useHydrated();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Soothing sounds</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Generated on your phone — no downloads, works offline.
      </p>
      {hydrated ? <SoundPlayer /> : <div className="h-64 animate-pulse rounded-2xl bg-muted/60" />}
    </div>
  );
}
