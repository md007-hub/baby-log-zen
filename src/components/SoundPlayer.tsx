import { useEffect, useState } from "react";
import { AudioLines, CloudRain, Lock, Pause, Play, Volume1, Volume2, Waves, Music2, Wind, Fan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePro } from "@/hooks/usePro";
import {
  type NoiseType,
  setMinutes,
  setVolume,
  toggle,
  useSoundEngine,
} from "@/lib/soundEngine";

const NOISES: { id: NoiseType; label: string; blurb: string; Icon: typeof Waves }[] = [
  { id: "white", label: "White Noise", blurb: "Bright, even hiss — like a fan", Icon: AudioLines },
  { id: "lullaby", label: "Gentle Lullaby", blurb: "A soft, repeating melody", Icon: Music2 },
  { id: "pink", label: "Pink Noise", blurb: "Softer, balanced — like steady rain", Icon: CloudRain },
  { id: "brown", label: "Brown Noise", blurb: "Deep rumble — like distant surf", Icon: Waves },
  { id: "vacuum", label: "Vacuum Cleaner", blurb: "Steady low motor hum", Icon: Fan },
  { id: "dryer", label: "Hair Dryer", blurb: "Warm, even rushing air", Icon: Wind },
  { id: "ocean", label: "Ocean Waves", blurb: "Slow swells of surf", Icon: Waves },
  { id: "rain", label: "Soft Rain", blurb: "Gentle patter on the window", Icon: CloudRain },
];

const DURATIONS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "60m", minutes: 60 },
  { label: "∞ Continuous", minutes: 0 },
];

function useRemaining(endsAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.round((endsAt - now) / 1000));
}

export function SoundPlayer() {
  const { active, volume, minutes, endsAt, fading } = useSoundEngine();
  const { isPro, openUpgrade } = usePro();
  const remaining = useRemaining(endsAt);
  const status = !active
    ? "Tap a sound to start"
    : fading
      ? "Fading out…"
      : remaining === null
        ? "Playing continuously"
        : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} left`;

  useEffect(() => {
    if (!isPro && active && active !== "white" && active !== "lullaby") void toggle(active);
  }, [isPro, active]);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {NOISES.map(({ id, label, blurb, Icon }) => {
          const on = active === id;
           const locked = !isPro && id !== "white" && id !== "lullaby";
          return (
            <li key={id}>
               <Button
                type="button"
                 variant="ghost"
                onClick={() =>
                  locked
                     ? openUpgrade(`${label} is part of Nestling Pro. White Noise and Gentle Lullaby stay free.`)
                    : void toggle(id)
                }
                aria-pressed={on}
                aria-label={`${on ? "Pause" : "Play"} ${label}`}
                className={cn(
                  "tap-card flex w-full items-center gap-4 border p-4 text-left",
                  on ? "border-primary bg-primary/10" : "border-border/60 bg-card shadow-soft",
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    on ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className={cn("h-6 w-6", on && "animate-pulse")} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-base font-bold">
                    {label}
                    {locked && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Pro
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">{blurb}</span>
                </span>
                <span
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {locked ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : on ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="ml-0.5 h-6 w-6" />
                  )}
                </span>
               </Button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">Volume</p>
          <p className="text-sm font-semibold tabular-nums">{Math.round(volume * 100)}%</p>
        </div>
        <div className="flex items-center gap-3">
          <Volume1 className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-3 w-full cursor-pointer rounded-full accent-primary"
          />
          <Volume2 className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>

        <p className="mb-2 mt-5 text-sm font-semibold text-muted-foreground">Sleep timer</p>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
             <Button
              key={d.label}
              type="button"
               variant="ghost"
              onClick={() => setMinutes(d.minutes)}
              aria-pressed={minutes === d.minutes}
              className={cn(
                "tap-card min-h-12 rounded-full px-1 text-sm font-semibold",
                d.minutes === 0 && "text-xs",
                minutes === d.minutes
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {d.label}
             </Button>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {status}
        </p>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Keeps playing while you switch tabs. Timers fade out gently over 5 seconds.
      </p>
    </div>
  );
}
