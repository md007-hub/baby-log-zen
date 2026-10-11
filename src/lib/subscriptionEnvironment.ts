/** Existing subscription records and family/AI checks still distinguish test and live data. */
export function subscriptionEnvironment(): "sandbox" | "live" {
  return import.meta.env.DEV ? "sandbox" : "live";
}