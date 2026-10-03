import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFamily } from "@/hooks/useFamily";
import { useHydrated } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";
import { ageInMonths, latestPercentiles, METRIC_KEY, METRIC_LABEL, ordinal, PERCENTILES, sexOf, valueAt, type GrowthRow, type Metric } from "@/lib/growth";

export const Route = createFileRoute("/growth")({
  head: () => ({
    meta: [
      { title: "Growth & WHO Percentiles — Nestling" },
      { name: "description", content: "Track weight, length and head circumference against WHO growth standards." },
      { property: "og:title", content: "Growth & WHO Percentiles — Nestling" },
      { property: "og:description", content: "Plot your baby's growth on WHO 0–24 month percentile curves." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GrowthPage,
});

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
const field = "h-12 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-base tabular-nums";

function GrowthPage() {
  const hydrated = useHydrated();
  const { baby, user } = useFamily();
  const [rows, setRows] = useState<GrowthRow[]>([]);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [head, setHead] = useState("");
  const [wUnit, setWUnit] = useState<"kg" | "lb">("kg");
  const [lUnit, setLUnit] = useState<"cm" | "in">("cm");
  const [metric, setMetric] = useState<Metric>("weight");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!baby) return;
    const { data } = await supabase.from("baby_growth").select("*").eq("baby_id", baby.id).order("measured_on");
    setRows((data ?? []) as GrowthRow[]);
  }, [baby]);
  useEffect(() => { void load(); }, [load]);

  const sex = sexOf(baby?.gender);
  const birth = baby?.date_kind === "birth" ? baby.birth_date : null;
  const badges = latestPercentiles(rows, sex, birth);

  const chart = useMemo(() => {
    if (!sex) return null;
    const curves = Array.from({ length: 49 }, (_, i) => {
      const m = i / 2;
      const o: Record<string, number> = { m };
      for (const p of PERCENTILES) o[`p${p}`] = Number(valueAt(metric, sex, m, p)!.toFixed(2));
      return o;
    });
    const points = birth
      ? rows.filter((r) => r[METRIC_KEY[metric]] != null).map((r) => ({ m: Number(ageInMonths(birth, r.measured_on).toFixed(2)), baby: Number(r[METRIC_KEY[metric]]) })).filter((p) => p.m >= 0 && p.m <= 24)
      : [];
    return { curves, points };
  }, [sex, birth, rows, metric]);

  const save = async () => {
    if (!baby) return;
    const w = weight ? Number(weight) * (wUnit === "lb" ? 0.453592 : 1) : null;
    const l = length ? Number(length) * (lUnit === "in" ? 2.54 : 1) : null;
    const h = head ? Number(head) * (lUnit === "in" ? 2.54 : 1) : null;
    if (w == null && l == null && h == null) { toast.error("Enter at least one measurement"); return; }
    if ((w != null && !(w > 0 && w < 40)) || (l != null && !(l > 20 && l < 130)) || (h != null && !(h > 20 && h < 70))) { toast.error("One of the values looks out of range"); return; }
    if (!date || date > today()) { toast.error("Pick a date that isn't in the future"); return; }
    setBusy(true);
    const { error } = await supabase.from("baby_growth").insert({
      baby_id: baby.id, measured_on: date,
      weight_kg: w == null ? null : Number(w.toFixed(3)), length_cm: l == null ? null : Number(l.toFixed(1)), head_cm: h == null ? null : Number(h.toFixed(1)),
    });
    setBusy(false);
    if (error) { toast.error("Couldn't save measurement"); return; }
    setWeight(""); setLength(""); setHead("");
    toast.success("Measurement saved");
    void load();
  };

  if (!hydrated) return null;
  if (!user || !baby) return <p className="rounded-3xl bg-card p-6 text-center shadow-soft">Sign in and set up a baby to track growth. <Link to="/" className="font-semibold underline">Back</Link></p>;

  const unitFor = (m: Metric) => (m === "weight" ? "kg" : "cm");

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"><ArrowLeft className="h-4 w-4" />Tracker</Link>
      <section className="rounded-3xl bg-tummy-tint p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tummy text-tummy-foreground"><Ruler className="h-5 w-5" /></span>
          <h1 className="text-lg font-bold">{baby.name}'s growth</h1>
        </div>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => <span key={b.metric} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-soft">{METRIC_LABEL[b.metric]}: {b.pct != null ? `${ordinal(b.pct)} percentile` : `${b.value} ${unitFor(b.metric)}`}</span>)}
          </div>
        ) : <p className="text-sm text-muted-foreground">Add a measurement to see percentiles.</p>}
        {(!sex || !birth) && <p className="mt-2 text-xs text-muted-foreground">Percentiles need a date of birth and a gender of Boy or Girl in the baby profile.</p>}
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="text-base font-bold">Add measurement</h2>
        <label className="flex items-center gap-2 text-sm font-medium">Date<input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        <div className="flex items-center gap-2"><label htmlFor="g-w" className="w-16 text-sm font-medium">Weight</label><input id="g-w" type="number" inputMode="decimal" step="0.01" placeholder="0" value={weight} onFocus={selectAll} onChange={(e) => setWeight(e.target.value)} className={field} /><Button type="button" variant="outline" onClick={() => { setWeight(""); setWUnit(wUnit === "kg" ? "lb" : "kg"); }} className="h-12 w-16 rounded-xl">{wUnit}</Button></div>
        <div className="flex items-center gap-2"><label htmlFor="g-l" className="w-16 text-sm font-medium">Length</label><input id="g-l" type="number" inputMode="decimal" step="0.1" placeholder="0" value={length} onFocus={selectAll} onChange={(e) => setLength(e.target.value)} className={field} /><Button type="button" variant="outline" onClick={() => { setLength(""); setHead(""); setLUnit(lUnit === "cm" ? "in" : "cm"); }} className="h-12 w-16 rounded-xl">{lUnit}</Button></div>
        <div className="flex items-center gap-2"><label htmlFor="g-h" className="w-16 text-sm font-medium">Head</label><input id="g-h" type="number" inputMode="decimal" step="0.1" placeholder="0" value={head} onFocus={selectAll} onChange={(e) => setHead(e.target.value)} className={field} /><span className="w-16 text-center text-sm text-muted-foreground">{lUnit}</span></div>
        <Button type="button" disabled={busy} onClick={() => void save()} className="h-12 w-full rounded-2xl text-base">Save measurement</Button>
      </section>

      {chart && (
        <section className="rounded-3xl bg-card p-4 shadow-soft">
          <div className="mb-3 grid grid-cols-3 rounded-full bg-muted p-1" role="group" aria-label="Chart metric">
            {(["weight", "length", "head"] as Metric[]).map((m) => <Button key={m} type="button" variant="ghost" aria-pressed={metric === m} onClick={() => setMetric(m)} className={cn("h-10 rounded-full text-foreground", metric === m && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}>{METRIC_LABEL[m]}</Button>)}
          </div>
          <p className="mb-2 text-xs text-muted-foreground">WHO {sex === "boy" ? "boys" : "girls"} · 3rd, 15th, 50th, 85th, 97th percentiles ({unitFor(metric)} by month)</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="m" type="number" domain={[0, 24]} ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} labelFormatter={(m) => `${Number(m).toFixed(1)} months`} />
                {PERCENTILES.map((p) => <Line key={p} data={chart.curves} dataKey={`p${p}`} name={`${ordinal(p)}`} dot={false} strokeWidth={p === 50 ? 2 : 1} stroke={p === 50 ? "var(--primary)" : "var(--muted-foreground)"} strokeOpacity={p === 50 ? 0.9 : 0.45} isAnimationActive={false} />)}
                <Line data={chart.points} dataKey="baby" name={baby.name} stroke="var(--tummy-foreground)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--tummy-foreground)" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="rounded-3xl bg-card p-4 shadow-soft">
          <h2 className="mb-2 text-base font-bold">History</h2>
          <ul className="divide-y divide-border">
            {[...rows].reverse().map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-24 shrink-0 font-medium">{r.measured_on}</span>
                <span className="min-w-0 flex-1 text-muted-foreground">{[r.weight_kg != null && `${r.weight_kg} kg`, r.length_cm != null && `${r.length_cm} cm`, r.head_cm != null && `head ${r.head_cm} cm`].filter(Boolean).join(" · ")}</span>
                <Button type="button" variant="ghost" aria-label="Delete measurement" className="h-10 w-10 rounded-full" onClick={async () => { await supabase.from("baby_growth").delete().eq("id", r.id); void load(); }}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
