# Qualia Commons Frontend — Iteration

UI-only rebuild of every Qualia product on one design system. No API calls yet: screens read
mock data through `src/services/*` so integrating the backend later changes services, not screens.

## Run

```bash
npm install
npm run dev          # http://localhost:5180
```

Open `/login` and pick a role under "Preview as", or add `?as=admin|agent|superadmin` to any URL.

## Folders

```
src/
  app/                 App.jsx (routes), products.js (registry), navIndex.js, providers/ (theme, session)
  design-system/       tokens.css + every UI primitive and chart. Import from '@/design-system'.
  shared/layout/       AppShell (sidebar + topbar), Page, PageHeader, SectionTitle, ProductMark, QualiaLogo
  shared/patterns/     Cross-product blocks: CallDetailDrawer, AudioPlayer, Transcript, ScoreBreakdown,
                       DncManager, DispositionsManager, CreditBanner, LockedFeature
  services/            client.js (mock() today, http() later) + one service file per product
  mocks/               seed.js (deterministic random), calls.js (shared call generator), per-product data
  products/<id>/       nav.js, routes.jsx, pages/, components/ (product-only pieces)
  lib/                 cn, format (numbers, dates, durations, phone), hooks (useQuery, usePersistentState…)
```

Products: `agentflow` (AI voice), `dialflow` (human dialer), `ultrachat` (WhatsApp), `businesspulse`
(AI QA, was CallPulse), `insights` (ask your data, all products), `commons` (Qualia admin console at /admin).

## Rules

1. **Minimal colour, light only.** Neutral greys + one accent (`brand`, blue) for the primary action, active
   nav, links and the main chart series. `success`/`warning`/`danger` only for real state (failed, over limit…),
   never decoration. Products are told apart by icon and name, not colour. No gradients, glows, blurred blobs,
   dark hero cards or coloured icon tiles. Never hard-code a colour; use tokens (`bg-surface`, `text-ink`,
   `text-ink-muted`, `border-line`, `text-brand`…). Charts: one series = brand; a second series = `neutral`
   (grey) when it's a baseline/total; categorical colours only when categories must be told apart.
2. **Compose, don't rebuild.** Buttons, tables, filters, modals, drawers, tabs, stat cards, charts, empty
   states, toasts and confirms all exist in `@/design-system`. If something is missing and reusable, add it there.
3. **Icons:** Phosphor only (`@phosphor-icons/react`), same set as the landing page.
4. **Data:** screens call `useQuery(() => service.fn(args), [deps])` and handle `loading` (skeletons),
   empty and error. Services return `mock(data)`.
5. **One pattern each:** filters apply instantly with a Reset; destructive actions use `useConfirm()`;
   feedback uses `useToast()`; long forms are step-by-step wizards with a review step; every live screen
   shows `<LiveIndicator updatedAt />`; every chart sits in a `ChartCard` with a table view.
6. **Formatting** goes through `@/lib/format` (₹, Indian digit grouping, durations, phone numbers).
7. **Responsive:** every page works at 1280 px laptop and tablet; agent and supervisor screens first.
8. **The Admin Console is internal** (Qualia team only): its own login at `/admin/login`, no tenant product switcher.
9. **Wayfinding is shared, not per page.** The app shell names the browser tab from the sidebar label
   ("Campaigns · Agent Flow · Qualia"); sub pages get it from a string `PageHeader` title (or `usePageTitle`).
   A role opening a page its sidebar hides (nav item `roles`) sees `<NoAccess>` with a way back, never a silent
   bounce; unknown routes use `<NotFoundState productId>`. Signed-out deep links return to the same URL after login.
10. **Errors:** `useQuery` failures show one Retry banner in the shell automatically; tables take
   `error`/`onRetry` (`<DataTable error={error} onRetry={reload} />`), other blocks use `<ErrorState onRetry />`.
   A crash in one page is caught by `PageErrorBoundary`, so the sidebar keeps working.
11. **Long forms** call `useUnsavedChanges(dirty)` (confirm on in-app navigation + browser prompt on close);
   call `.allow()` before navigating away on purpose. Disabled primary buttons say why: `<Button disabled disabledReason="…">`.
12. **⌘K** lists recent pages, quick actions (`src/app/actions.js`, role-filtered like the sidebar), apps and pages.

## Next steps

- **API:** replace `mock(...)` in `src/services/<product>.js` with `http(...)` calls; screens stay as they are.
- **Promote to the design system** (built inside products, reusable): `PhonePreview` + `FlowCanvas` (UltraChat),
  `Softphone`, `StatusGantt`, `TimeSplitBar`, `Supervision` bar, `DispositionPicker`, `downloadCsv` (DialFlow),
  `FieldBuilder`, `Slider`, `KeyValueEditor`, `CodeBlock`, `VoiceCard` (Agent Flow), `DumbbellChart`, `ScoreBar`,
  `SessionResult` (Business Pulse), `SipLinesEditor`, `AddCreditsModal`, `StarRating` (console).
- **Demo URL params:** `?fail=1` (every mock call fails, to review error states), `?as=` (wins over a stored session), `?theme=`, `/insights?q=…`, `/dialflow/workspace?campaign=cmp_wakad&demo=call|missed`,
  `/businesspulse?process=proc_support` (locked features), `/ultrachat/campaigns/new?step=3`, `/ultrachat/wallet?topup=1`.
