import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Baby, Feather, FileText, HeartPulse, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFamily } from "@/hooks/useFamily";

const featureSlides = [
  {
    icon: Users,
    title: "Real-time Partner Sync",
    description: "Keep both parents on the same page with live updates, wherever you are.",
    label: "Care, together",
    tint: "bg-diaper text-diaper-foreground",
  },
  {
    icon: Baby,
    title: "Effortless 1-Tap Tracking",
    description: "Feeds, sleep, diapers, tummy time & pumping with zero friction.",
    label: "The little things, simply",
    tint: "bg-feed text-feed-foreground",
  },
  {
    icon: HeartPulse,
    title: "Nanny AI & Doctor PDF",
    description: "Thoughtful pediatric guidance and one-tap clinical export reports.",
    label: "A little more reassurance",
    tint: "bg-sleep text-sleep-foreground",
  },
] as const;

const TOTAL_STEPS = featureSlides.length + 1; // step 0 = brand splash

export function IntroductionCarousel() {
  const [step, setStep] = useState(0);
  const touchStart = useRef<number | null>(null);
  const { user, baby } = useFamily();
  const destination = user ? (baby ? "/" : "/onboarding") : "/auth";
  const featureStep = step - 1; // 0-based index into featureSlides
  const onSplash = step === 0;
  const slide = onSplash ? undefined : featureSlides[featureStep] ?? featureSlides[0];
  const onLast = step === TOTAL_STEPS - 1;

  const go = (next: number) => setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)));

  return (
    <div
      className="flex min-h-[calc(100dvh-3rem)] flex-col justify-between py-5"
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(delta) > 55) go(step + (delta < 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      {onSplash ? (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-3">
            <Feather aria-hidden="true" strokeWidth={1.5} className="h-9 w-9 text-primary" />
            <h1 className="font-display text-4xl font-bold tracking-tight">Nestling</h1>
          </div>
          <p className="mt-4 max-w-xs text-base leading-relaxed text-muted-foreground">
            The calm, shared baby tracker for modern parents.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end gap-3">
            {!user && <Link to="/auth" className="text-xs font-medium text-muted-foreground underline underline-offset-4">Already have an account? Log In</Link>}
            {user && baby && <Link to="/" className="text-xs font-medium text-muted-foreground underline underline-offset-4">Back to Tracker</Link>}
          </div>

          <div key={featureStep} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
            {(() => {
              const SlideIcon = slide!.icon;
              return (
                <div className={`mb-9 flex aspect-[5/4] w-full flex-col items-center justify-center gap-6 rounded-md ${slide!.tint}`}>
                  <SlideIcon aria-hidden="true" strokeWidth={1.1} className="h-24 w-24 opacity-90" />
                  {featureStep === 2 && (
                    <FileText aria-hidden="true" strokeWidth={1.3} className="h-12 w-12 opacity-90" />
                  )}
                </div>
              );
            })()}
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{slide!.label}</p>
            <h1 className="max-w-sm font-display text-3xl font-bold leading-tight">{slide!.title}</h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">{slide!.description}</p>
          </div>
        </>
      )}

      <div className="space-y-6 pt-8">
        {!onSplash && (
          <div className="flex justify-center gap-2" aria-label={`Feature slide ${featureStep + 1} of ${featureSlides.length}`}>
            {featureSlides.map((item, index) => (
              <Button key={item.title} type="button" variant="ghost" aria-label={`Go to feature slide ${index + 1}`} aria-current={index === featureStep ? "step" : undefined} onClick={() => go(index + 1)} className="h-11 w-11 rounded-full p-0">
                <span className={`h-2.5 w-2.5 rounded-full ${index === featureStep ? "bg-primary" : "bg-muted-foreground/40"}`} />
              </Button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          {step > 0 && <Button variant="outline" type="button" aria-label="Previous slide" onClick={() => go(step - 1)} className="h-12 w-12 p-0"><ArrowLeft /></Button>}
          {onSplash ? (
            <>
              <Button type="button" onClick={() => go(1)} className="h-12 flex-1 text-base">Get Started <ArrowRight /></Button>
              {user && baby ? (
                <Button asChild variant="outline" className="h-12 flex-1 text-base"><Link to="/">Back to Tracker</Link></Button>
              ) : (
                <Button asChild variant="outline" className="h-12 flex-1 text-base"><Link to="/auth">Log In</Link></Button>
              )}
            </>
          ) : !onLast ? (
            <Button type="button" onClick={() => go(step + 1)} className="h-12 flex-1 text-base">Next <ArrowRight /></Button>
          ) : (
            <Button asChild className="h-12 flex-1 text-base">{destination === "/auth" ? <Link to="/auth" search={{ mode: "up" }}>Get Started <ArrowRight /></Link> : <Link to={destination}>Get Started <ArrowRight /></Link>}</Button>
          )}
        </div>
        {!onSplash && !user && (
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-4">Already have an account? Log In</Link>
          </p>
        )}
      </div>
    </div>
  );
}
