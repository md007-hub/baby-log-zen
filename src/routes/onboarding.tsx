import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Baby, FileText, HeartPulse, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFamily } from "@/hooks/useFamily";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [
    { title: "Set up your baby · Nestling" }, { name: "description", content: "Meet Nestling and set up your baby's shared care profile." },
    { property: "og:title", content: "Set up your baby · Nestling" }, { property: "og:description", content: "Start sharing your baby's care with your family." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Onboarding,
});

const slides = [
  { icon: Users, title: "Together, in real time", text: "You and your partner see the same care notes as they happen, even across phones." },
  { icon: Baby, title: "The little things, in one tap", text: "Keep feeds, sleep, diapers, tummy time and pumping together, even offline." },
  { icon: HeartPulse, title: "A little more reassurance", text: "Ask Nanny AI about daily care and bring a clear report to your pediatrician.", secondary: FileText },
];

function Onboarding() {
  const { ready, user, baby, refresh, selectBaby } = useFamily();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [dateKind, setDateKind] = useState<"birth" | "due">("birth");
  const [gender, setGender] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [busy, setBusy] = useState(false);
  const touchStart = useRef<number | null>(null);
  useEffect(() => { if (ready && user && baby) navigate({ to: "/", replace: true }); }, [ready, user, baby, navigate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || !date || !gender) return;
    const kg = weight ? Number(weight) * (unit === "lb" ? 0.45359237 : 1) : null;
    if (kg !== null && (!Number.isFinite(kg) || kg <= 0 || kg > 30)) { toast.error("Enter a valid birth weight"); return; }
    if (dateKind === "birth" && date > new Date().toISOString().slice(0, 10)) { toast.error("A birth date can't be in the future"); return; }
    setBusy(true);
    try {
      const displayName = typeof user.user_metadata?.['display_name'] === "string" ? user.user_metadata['display_name'].trim() : "";
      if (displayName) {
        const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName });
        if (error) throw error;
      }
      const { data, error } = await supabase.rpc("create_baby", { _name: name.trim() });
      if (error) throw error;
      const { error: updateError } = await supabase.from("babies").update({
        birth_date: date, date_kind: dateKind, gender, birth_weight_kg: kg === null ? null : Math.round(kg * 100) / 100,
      }).eq("id", data.id);
      if (updateError) throw updateError;
      await refresh();
      selectBaby(data.id);
      navigate({ to: "/", replace: true });
      toast.success(`${name.trim()}'s profile is ready`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't save baby profile"); }
    finally { setBusy(false); }
  };

  if (!ready) return <div className="h-80 animate-pulse bg-muted" />;
  if (!user) return <div className="py-12 text-center"><h1 className="font-display text-2xl font-bold">Let's get started</h1><Button asChild className="mt-5 h-12"><Link to="/auth">Log in or create an account</Link></Button></div>;
  if (baby) return null;

  if (step < slides.length) {
    const slide = slides[step] ?? slides[0];
    if (!slide) return null;
    const Icon = slide.icon;
    return <div className="flex min-h-[min(72dvh,610px)] flex-col justify-between py-6" onTouchStart={e => { touchStart.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => {
      if (touchStart.current === null) return;
      const delta = (e.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
      if (Math.abs(delta) > 60) setStep(Math.max(0, Math.min(3, step + (delta < 0 ? 1 : -1))));
      touchStart.current = null;
    }}>
      <div className="flex justify-between text-xs font-semibold uppercase text-muted-foreground"><span>Nestling</span><span>0{step + 1} / 03</span></div>
      <div className="py-10">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon className="h-11 w-11" strokeWidth={1.5} /></div>
        <h1 className="max-w-xs font-display text-3xl font-bold leading-tight">{slide.title}</h1>
        <p className="mt-4 max-w-xs text-base leading-relaxed text-muted-foreground">{slide.text}</p>
      </div>
      <div className="space-y-5">
        <div className="flex gap-2" aria-label="Introduction progress">{slides.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
        <div className="flex gap-3"><Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)} className="h-12 w-12 px-0" aria-label="Previous"><ArrowLeft /></Button><Button type="button" className="h-12 flex-1" onClick={() => setStep(step + 1)}>{step === 2 ? "Set up baby" : "Next"}<ArrowRight /></Button></div>
        <Button type="button" variant="ghost" className="h-10 w-full text-muted-foreground" onClick={() => setStep(3)}>Skip introduction</Button>
      </div>
    </div>;
  }

  return <div className="space-y-5 py-5">
    <div><p className="text-xs font-semibold uppercase text-muted-foreground">Your family</p><h1 className="mt-2 font-display text-3xl font-bold">Meet your little one</h1><p className="mt-2 text-sm text-muted-foreground">Create a shared space for their care. You can invite your partner afterward.</p></div>
    <form onSubmit={save} className="space-y-5">
      <label className="block text-sm font-semibold">Baby's name<Input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="mt-1.5 h-12 text-base" /></label>
      <div><p className="mb-2 text-sm font-semibold">Which date do you know?</p><div className="grid grid-cols-2 gap-2">{(["birth", "due"] as const).map(kind => <Button type="button" key={kind} variant={dateKind === kind ? "default" : "outline"} aria-pressed={dateKind === kind} onClick={() => setDateKind(kind)} className="h-12">{kind === "birth" ? "Date of birth" : "Due date"}</Button>)}</div></div>
      <label className="block text-sm font-semibold">{dateKind === "birth" ? "Date of birth" : "Due date"}<Input aria-label={dateKind === "birth" ? "Date of birth" : "Due date"} type="date" required max={dateKind === "birth" ? new Date().toISOString().slice(0, 10) : undefined} value={date} onChange={e => setDate(e.target.value)} className="mt-1.5 h-12 text-base" /></label>
      <label className="block text-sm font-semibold">Gender<select required value={gender} onChange={e => setGender(e.target.value)} className="mt-1.5 h-12 w-full rounded-md border border-input bg-background px-3 text-base"><option value="">Select</option><option value="girl">Girl</option><option value="boy">Boy</option><option value="other">Another description</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
      <div><label className="block text-sm font-semibold" htmlFor="weight">Birth weight <span className="font-normal text-muted-foreground">(optional)</span></label><div className="mt-1.5 flex gap-2"><Input id="weight" type="number" inputMode="decimal" min="0.1" max={unit === "kg" ? "30" : "66"} step="0.01" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight" className="h-12 flex-1 text-base" /><Button type="button" variant="outline" onClick={() => { setWeight(""); setUnit(unit === "kg" ? "lb" : "kg"); }} className="h-12 w-16">{unit}</Button></div></div>
      <Button type="submit" disabled={busy} className="h-12 w-full text-base">{busy ? "Saving…" : "Create baby profile"}<ArrowRight /></Button>
    </form>
    <Button variant="ghost" onClick={() => setStep(2)} className="w-full text-muted-foreground"><ArrowLeft />Back</Button>
    <p className="text-center text-sm text-muted-foreground">Already have an invite? <Link to="/family" className="font-semibold text-primary underline">Join your partner</Link></p>
  </div>;
}