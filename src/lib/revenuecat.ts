import { Capacitor } from "@capacitor/core";
import type { CustomerInfo } from "@revenuecat/purchases-capacitor";
import { syncEntitlementsFromRevenueCat } from "@/lib/entitlements.functions";

/** Fired after entitlements are re-synced so useEntitlements can refetch. */
export const ENTITLEMENTS_EVENT = "nestling-entitlements-changed";

const isNative = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

// Loaded lazily so the web/SSR bundle never evaluates the native plugin.
const loadPurchases = async () => (await import("@revenuecat/purchases-capacitor")).Purchases;

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ENTITLEMENTS_EVENT));
}

export function hasActiveEntitlement(info: CustomerInfo): boolean {
  return Object.keys(info.entitlements.active ?? {}).length > 0;
}

/**
 * Re-syncs the user's entitlement row. The write happens on the server after
 * verifying with RevenueCat, so a modified client can't grant itself ad-free.
 */
export async function syncRevenueCatEntitlements(_userId: string): Promise<void> {
  try {
    await syncEntitlementsFromRevenueCat();
  } catch (e) {
    console.warn("RevenueCat sync failed", e);
  } finally {
    notify();
  }
}

let listenerAttached = false;

/** Call once at app start. No-op on web. */
export async function initRevenueCat(): Promise<void> {
  if (!isNative() || listenerAttached) return;
  try {
    const Purchases = await loadPurchases();
    const apiKey =
      Capacitor.getPlatform() === "ios"
        ? import.meta.env['VITE_REVENUECAT_IOS_KEY'] as string | undefined
        : import.meta.env['VITE_REVENUECAT_ANDROID_KEY'] as string | undefined;
    if (apiKey) await Purchases.configure({ apiKey });
    await Purchases.addCustomerInfoUpdateListener(() => {
      void syncRevenueCatEntitlements("");
    });
    listenerAttached = true;
  } catch (e) {
    console.warn("RevenueCat init failed", e);
  }
}

export async function revenueCatLogIn(userId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const Purchases = await loadPurchases();
    await Purchases.logIn({ appUserID: userId });
    await syncRevenueCatEntitlements(userId);
  } catch (e) {
    console.warn("RevenueCat logIn failed", e);
  }
}

export async function revenueCatLogOut(): Promise<void> {
  if (!isNative()) return;
  try {
    const Purchases = await loadPurchases();
    await Purchases.logOut();
  } catch (e) {
    // logOut throws when the current user is already anonymous — safe to ignore.
    console.warn("RevenueCat logOut skipped", e);
  }
}

export async function restorePurchases(userId: string): Promise<boolean> {
  if (!isNative()) {
    await syncRevenueCatEntitlements(userId);
    return false;
  }
  const Purchases = await loadPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  await syncRevenueCatEntitlements(userId);
  return hasActiveEntitlement(customerInfo);
}
