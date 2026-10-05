import { useEffect, useState } from "react";

export type HomePrefs = { pumping: boolean; notes: boolean; growth: boolean; milestones: boolean };
const KEY = "nestling-home-prefs";
const DEFAULTS: HomePrefs = { pumping: true, notes: true, growth: true, milestones: true };

function read(): HomePrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** Per-device home layout toggles (Edit Home sheet). */
export function useHomePrefs() {
  const [prefs, setPrefs] = useState<HomePrefs>(DEFAULTS);
  useEffect(() => {
    const sync = () => setPrefs(read());
    sync();
    window.addEventListener("nestling-home-prefs", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nestling-home-prefs", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const set = (k: keyof HomePrefs, v: boolean) => {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [k]: v }));
    window.dispatchEvent(new Event("nestling-home-prefs"));
  };
  return [prefs, set] as const;
}
