// Module-level Web Audio engine: lives outside React so playback survives tab/route changes.
import { useSyncExternalStore } from "react";

export type NoiseType = "white" | "pink" | "brown";

type State = {
  active: NoiseType | null;
  volume: number;
  minutes: number; // 0 = continuous
  endsAt: number | null;
  fading: boolean;
};

const FADE_SECONDS = 5;
let state: State = { active: null, volume: 0.5, minutes: 0, endsAt: null, fading: false };
const listeners = new Set<() => void>();
const buffers = new Map<NoiseType, AudioBuffer>();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function buildBuffer(c: AudioContext, type: NoiseType) {
  const length = c.sampleRate * 8;
  const buffer = c.createBuffer(2, length, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      if (type === "white") d[i] = w * 0.35;
      else if (type === "pink") {
        // Paul Kellet's 1/f filter
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.1;
        b6 = w * 0.115926;
      } else {
        // integrated white noise -> 1/f²
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    }
    // short crossfade so the loop point is seamless
    const xf = Math.floor(c.sampleRate * 0.05);
    for (let i = 0; i < xf; i++) {
      const t = i / xf;
      d[i] = d[i]! * t + d[length - xf + i]! * (1 - t);
    }
  }
  return buffer;
}

function clearTimers() {
  if (timer) clearTimeout(timer);
  if (fadeTimer) clearTimeout(fadeTimer);
  timer = fadeTimer = null;
}

function stopSource() {
  try { source?.stop(); } catch { /* already stopped */ }
  source?.disconnect();
  source = null;
}

function scheduleTimer() {
  clearTimers();
  if (!state.active || state.minutes === 0) return set({ endsAt: null, fading: false });
  const ms = state.minutes * 60_000;
  set({ endsAt: Date.now() + ms, fading: false });
  timer = setTimeout(fadeOut, Math.max(0, ms - FADE_SECONDS * 1000));
}

function fadeOut() {
  if (!ctx || !master) return stop();
  set({ fading: true });
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.0001, now + FADE_SECONDS);
  fadeTimer = setTimeout(stop, FADE_SECONDS * 1000 + 50);
}

// iOS: a playing <audio> element moves the audio session to "playback",
// so Web Audio is heard even with the hardware silent switch on.
let silentEl: HTMLAudioElement | null = null;
function silentWavUrl() {
  const rate = 8000, samples = 800; // 0.1s of 8-bit silence
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + samples, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); str(36, "data"); v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
function unlockIosSession() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch { /* unsupported */ }
  if (!silentEl) {
    silentEl = new Audio(silentWavUrl());
    silentEl.loop = true;
    silentEl.setAttribute("playsinline", "");
    silentEl.setAttribute("x-webkit-airplay", "deny");
  }
  void silentEl.play().catch(() => { /* ignore */ });
}

export async function play(type: NoiseType) {
  // Everything below up to the first await runs synchronously inside the tap gesture.
  unlockIosSession();
  ctx ??= new AudioContext();
  const resuming = ctx.state !== "running" ? ctx.resume() : null;
  if (!master) {
    master = ctx.createGain();
    master.gain.value = state.volume;
    master.connect(ctx.destination);
  }
  if (resuming) await resuming;
  stopSource(); // one sound at a time
  let buf = buffers.get(type);
  if (!buf) buffers.set(type, (buf = buildBuffer(ctx, type)));
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(state.volume, now + 0.4);
  source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.connect(master);
  source.start();
  set({ active: type });
  scheduleTimer();
}

export function stop() {
  clearTimers();
  stopSource();
  if (master && ctx) master.gain.setValueAtTime(state.volume, ctx.currentTime);
  set({ active: null, endsAt: null, fading: false });
}

export function toggle(type: NoiseType) {
  return state.active === type ? stop() : play(type);
}

export function setVolume(v: number) {
  set({ volume: v });
  if (master && ctx && !state.fading) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

export function setMinutes(m: number) {
  set({ minutes: m });
  if (state.active) {
    if (state.fading && master && ctx) master.gain.setTargetAtTime(state.volume, ctx.currentTime, 0.1);
    scheduleTimer();
  }
}

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
export function useSoundEngine() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
