import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type NoiseType = "white" | "pink" | "brown";

const NOISES: { id: NoiseType; label: string; blurb: string }[] = [
  { id: "white", label: "White Noise", blurb: "Bright, even hiss — like a fan" },
  { id: "pink", label: "Pink Noise", blurb: "Softer, balanced — like steady rain" },
  { id: "brown", label: "Brown Noise", blurb: "Deep rumble — like distant surf" },
];

const DURATIONS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "60m", minutes: 60 },
  { label: "Continuous", minutes: 0 },
];

function createNoiseBuffer(ctx: AudioContext, type: NoiseType) {
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "white") {
      data[i] = white * 0.5;
    } else if (type === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

export function SoundPlayer() {
  const [noise, setNoise] = useState<NoiseType>("white");
  const [playing, setPlaying] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.6);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const stop = () => {
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    setPlaying(false);
    setRemaining(null);
  };

  const start = async () => {
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    await ctx.resume();

    sourceRef.current?.stop();
    const gain = gainRef.current ?? ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    gainRef.current = gain;

    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx, noise);
    source.loop = true;
    source.connect(gain);
    source.start();
    sourceRef.current = source;

    setPlaying(true);
    setRemaining(minutes > 0 ? minutes * 60 : null);
  };

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    if (!playing || remaining === null) return;
    if (remaining <= 0) {
      stop();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(id);
  }, [playing, remaining]);

  useEffect(() => {
    if (playing) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noise]);

  useEffect(() => () => stop(), []);

  const mmss =
    remaining === null
      ? "Continuous"
      : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {NOISES.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNoise(n.id)}
            className={cn(
              "tap-card flex w-full items-center justify-between border p-4 text-left",
              noise === n.id
                ? "border-primary bg-primary/10"
                : "border-border/60 bg-card shadow-soft",
            )}
          >
            <span>
              <span className="block text-base font-bold">{n.label}</span>
              <span className="block text-xs text-muted-foreground">{n.blurb}</span>
            </span>
            {noise === n.id && playing && <Volume2 className="h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
        <p className="mb-2 text-sm font-semibold text-muted-foreground">Timer</p>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => {
                setMinutes(d.minutes);
                if (playing) setRemaining(d.minutes > 0 ? d.minutes * 60 : null);
              }}
              className={cn(
                "min-h-12 rounded-xl px-1 text-sm font-semibold tap-card",
                minutes === d.minutes
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold text-muted-foreground" htmlFor="vol">
            Volume
          </label>
          <input
            id="vol"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 text-center shadow-soft">
        <p className="font-display text-3xl font-bold tabular-nums">{mmss}</p>
        <button
          type="button"
          onClick={() => (playing ? stop() : void start())}
          className="tap-card mt-4 flex min-h-16 w-full items-center justify-center gap-2 bg-primary text-lg font-bold text-primary-foreground"
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          {playing ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}
