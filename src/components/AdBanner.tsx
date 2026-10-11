import { useEffect } from "react";
import { useEntitlements } from "@/hooks/useEntitlements";

/**
 * AdMob banner slot.
 *
 * The banner is only initialized and rendered when the user's entitlements
 * allow ads: `!loading && !isAdFree`. When `isAdFree` is true the AdMob SDK is
 * never initialized and no banner is mounted.
 */
export function AdBanner() {
  const { isAdFree, loading } = useEntitlements();
  const eligible = !loading && !isAdFree;

  useEffect(() => {
    if (!eligible) return;
    // Initialize the AdMob banner here, e.g.:
    //   const banner = new AdMob.Banner({ adUnitId: BANNER_ID });
    //   await banner.show();
    return () => {
      // Hide/destroy the banner when no longer eligible or on unmount.
    };
  }, [eligible]);

  if (!eligible) return null;

  return (
    <div
      aria-label="Sponsored"
      className="mx-auto mb-1 flex h-12 w-full max-w-md items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
    >
      Sponsored
    </div>
  );
}
