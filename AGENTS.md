<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## App architecture
- Keep local-first tracking in Dexie and derive dashboard totals from live log queries, so offline writes immediately update the tracker.

## Brand system
- The Nestling header mark is the muted Lucide `<Feather />` icon beside the app name — no badge, no custom SVG. Do not reintroduce bird/nest illustrations in the header.
- Dexie stays the source of truth for the UI; src/lib/sync.ts pushes pending logs to `baby_logs` (keyed by client uuid) and applies realtime changes back into Dexie — keeps the app instant and offline-first.
- Pro access is checked via the `has_family_pro(env)` DB function (own or any co-parent's subscription) and Nanny AI's free limit via `consume_ai_question` — keeps family sharing and limits enforced in one place.
- Keep the introduction carousel shared between the signed-out home screen and the replayable tour, while onboarding is only for baby setup — prevents the two journeys from drifting apart.
