# 0003: Destructive confirmation as a single primitive

- **Date:** 2026-05-25
- **Status:** Accepted

## Context

Across the settings module the app had eight independent destructive-action confirmation dialogs: six "delete *resource*" dialogs (attribute, event, environment, localization, theme, API key) plus `MemberRemoveDialog` and `MemberTransferOwnerDialog`. Each was hand-built with its own chrome — its own `<AlertDialog>` (or, in the member cases, an `<Dialog>`) wiring, its own header layout, its own confirm button, its own copy.

That divergence had concrete failure modes that landed in production:

- **Wrong primitive in two places.** `MemberRemoveDialog` and `MemberTransferOwnerDialog` wrapped a `<Dialog>` rather than an `<AlertDialog>`. Both transferring ownership and removing a teammate are irreversible (well — re-invite is possible for remove, but the operation is significant enough to want a barrier), yet ESC and click-outside both dismissed the dialog. shadcn's distinction between `Dialog` and `AlertDialog` exists exactly for this; we ignored it.
- **Description rendered outside the header.** The same two member dialogs placed `<DialogDescription>` _after_ `<DialogHeader>` rather than inside it. The result was a visual rhythm break — title and body were in different visual blocks, separated by the header's bottom padding — that nothing in our other dialogs shared.
- **`destructive` variant inconsistently applied.** `MemberRemoveDialog`'s confirm button used the default primary variant. The action removed a teammate from a project; the button looked like "Save". `MemberTransferOwnerDialog`'s button correctly used `destructive`. The two related dialogs disagreed on whether they were destructive at all.
- **Three different title vocabularies.** The delete dialogs originally led with the generic "Are you absolutely sure?" (the shadcn template). Remove member led with literally "Confirm". Transfer ownership led with the full action verb "Transfer account ownership". No two read the same way and none of them matched the modern SaaS pattern of action-named titles ("Delete API key", "Remove member", "Transfer ownership") that Linear, Notion, Vercel, GitHub, and Stripe have all converged on.
- **Long unbroken names overflowed.** An API key named `GGGGGG…G` ran past the dialog right edge because `AlertDialogTitle` / `AlertDialogDescription` carried no overflow-wrap rule and the per-dialog override pattern was inconsistent.
- **English defaults leaked through every dialog regardless of locale.** The original `DeleteConfirmDialog` (the predecessor of this ADR's primitive) hardcoded `'Are you absolutely sure?'` and `'This action cannot be undone. This will permanently delete the {resourceLabel} {name}.'` as fallback strings. Every consumer relied on those fallbacks, so Chinese-locale users saw English copy.

The first attempt at consolidation only covered the delete dialogs and shipped as `DeleteConfirmDialog` in `@usertour/ui`. It worked for delete but the name then lied: `MemberRemoveDialog` and `MemberTransferOwnerDialog` could not naturally consume something called "Delete*", so they kept their hand-built chrome and the cycle of divergence resumed (the wrong-primitive and missing-variant issues above were re-introduced in the rewrite). This ADR records the second consolidation — the one that actually generalized.

## Decision

`@usertour/ui` exports a single primitive for destructive confirmation:

```ts
import { DestructiveConfirmDialog } from '@usertour/ui';

<DestructiveConfirmDialog
  title={...}
  description={...}
  confirmLabel={...}
  cancelLabel={...}
  open={...}
  onOpenChange={...}
  onConfirm={...}
  loading={...}
/>
```

The primitive owns:

- The `<AlertDialog>` wiring (not `<Dialog>`) — ESC and click-outside do not dismiss; the only exit is `Cancel` or `Confirm`.
- The visual chrome — soft-red circular badge with `RiAlertFill` on the left, title + description column on the right, footer with `Cancel` outline button + `Confirm` destructive `LoadingButton`.
- The widening to `max-w-xl` (576px) past `AlertDialog`'s default `max-w-lg` (512px), because the icon column eats ~56px and the default leaves common-case sentences wrapping mid-word.
- Long-name overflow handling, provided one layer down by `[overflow-wrap:anywhere]` on `AlertDialogTitle` and `AlertDialogDescription`.

The primitive does **not** own:

- **Copy.** `title`, `description`, `confirmLabel`, `cancelLabel` are required `ReactNode` props. Every real consumer passes i18n'd content. The two label fallbacks (`'Confirm'` / `'Cancel'`) exist only as a last-resort guard for tests or accidental misuse. This keeps `@usertour/ui` consistent with its `src/index.ts` invariant: _"composition UI primitives — no business knowledge"_; i18n state is business state and lives at the call site.
- **Mutation logic.** `onConfirm` is a callback; the consumer decides what runs. Loading state is also a consumer prop (`loading`), reflected onto the `LoadingButton`.
- **Custom layouts.** Consumers cannot pass `className`, an icon override, or a header slot. This is deliberate; per the next section, the cost of allowing customization is the divergence this ADR fights against.

The copy pattern is mandatory across consumers and lives in shared i18n keys:

```
settings.common.deleteConfirm.title         "Delete {{resource}}"
settings.common.deleteConfirm.description   "Are you sure you want to delete <strong>{{name}}</strong>? This action cannot be undone."
settings.common.deleteConfirm.confirm       "Delete"
```

For non-delete destructive actions (transfer ownership, remove member), the consumer writes domain-specific keys but the rhythm stays the same: title is action-named, description is the question with the entity name bolded inline, confirm-label is the action verb.

## Consequences

**Good:**

- Eight consumers (`api-row-actions`, the five per-resource `*-delete-dialog.tsx` files, `member-remove-dialog`, `member-transfer-owner-dialog`) share one source of truth for chrome. The two member dialogs in particular shrank from ~85 lines each to ~60, because their entire visual layer is now one `<DestructiveConfirmDialog>` JSX element.
- Any new destructive confirm (e.g. disabling 2FA, resetting a license, removing a webhook) inherits the visual treatment by importing the primitive. No new `<Dialog>` vs `<AlertDialog>` decision, no new icon design, no new button-variant audit.
- The wrong-primitive and wrong-variant defects this ADR's Context section enumerates are now structurally impossible to reintroduce in a new dialog that goes through the primitive. Reviewers can point at this ADR rather than rediscover the rules.
- The i18n leak is closed at the primitive level: there are no English defaults to fall through to. Consumers are forced to translate (or the button silently shows `'Confirm'` / `'Cancel'`, which is still neutral rather than wrong).
- Overflow is handled once, in `@usertour/alert-dialog`, and applies to any other `AlertDialog` consumer (`object-mapping-readonly` benefits without changes).

**Bad / Accepted:**

- Consumers lose the ability to slot a custom icon, change the layout, or inject extra elements between header and footer. A future destructive flow that genuinely needs a different shape (multi-step confirmation, type-the-name-to-confirm, an inline form field) cannot use this primitive and will need either an escape-hatch prop, a sibling primitive, or a from-scratch dialog. The Triggers section below covers when to make that call.
- The primitive's name is more abstract than what it replaces (`DestructiveConfirmDialog` vs `DeleteConfirmDialog`). Contributors looking for "delete confirmation" by name in the file tree must know to grep `Destructive`. This is the cost of generalizing — `DeleteConfirmDialog` was lying about its scope.
- Chrome lockdown means the eight consumers cannot make small visual tweaks. If a single section wants a different icon or button label tone, the answer is to change the primitive (and propagate to all eight) or to write a sibling primitive — not to fork.

## Alternatives Considered

### Alt-A: Keep `DeleteConfirmDialog` for delete, leave member dialogs hand-rolled

Treat the original primitive as a delete-only convenience; let `MemberRemoveDialog` and `MemberTransferOwnerDialog` continue to be bespoke.

- **Costs:** the visual / structural defects (`<Dialog>` not `<AlertDialog>`, description outside header, missing `destructive` variant) are the consequences of being bespoke. Leaving the member dialogs alone means leaving those defects in place. The two were also being touched in the same change set anyway — applying the destructive visual to them required either copying the chrome (the rejected anti-pattern this ADR consolidates) or consuming a shared primitive. Choosing "don't consolidate" is choosing "keep duplicating".
- **Rejected because:** the actual cost of bespoke chrome is the bugs above; the actual benefit was "the name fits". Generalizing the primitive's name (the cost above under Bad / Accepted) is cheap; carrying eight slightly-different destructive dialogs is not.

### Alt-B: Put i18n inside the primitive

Have `DestructiveConfirmDialog` call `useTranslation` internally and own the default copy (title `'Are you absolutely sure?'`, description templated on `{{resource}}` / `{{name}}`, etc.). Consumers pass `resourceLabel`, `name`, and the rest comes free.

- **Costs:** `@usertour/ui`'s `src/index.ts` header explicitly states "composition UI primitives — no business knowledge". i18n is business state in the sense that matters here: it depends on the consumer's `react-i18next` provider, on the consumer's i18n key tree, and (for `react-i18next`) on the consumer's `<Trans>` component for inline formatting like the bold name. Adding `useTranslation` to `@usertour/ui` would force every consumer of any primitive in this package to provide an i18n provider, even those (tests, Storybook future) that have no such provider.
- **Rejected because:** would invalidate `@usertour/ui`'s stated invariant, the same boundary ADR 0002 protects for `@usertour/hooks`. The consumer-passes-strings approach costs ~8 extra lines per consumer (a `<Trans>` wrapper) and keeps the primitive package free of i18n dependency.

### Alt-C: Build a `DestructiveConfirmDialog` in `@usertour/business-components` instead

`business-components` already depends on `react-i18next` for `Conditions` and `ExportEventsCard`. Building the destructive-confirm shell there would let the primitive own the i18n.

- **Costs:** `business-components` is the package for **business-aware** UI — it imports `IntegrationModel`, `Attribute`, `CompanyModel`. A confirmation dialog doesn't have business knowledge in that sense; it has _i18n_ knowledge, which is a different axis. Placing destructive-confirm there would conflate "depends on i18n" with "imports a domain type" and make the package boundary less informative.
- **Rejected because:** the consumer-passes-i18n pattern (Alt-B's reverse) costs less and keeps `@usertour/ui` as the right home for primitives whose only job is chrome.

### Alt-D: Replace shadcn `AlertDialog` with our own headless implementation

Build the primitive directly on Radix `AlertDialog` (skipping our `@usertour/alert-dialog` re-export) so the chrome class-overrides (the row layout, the max-w-xl) live in one place rather than threading through two layers.

- **Costs:** breaks the existing pattern where `@usertour/alert-dialog` is the canonical alert-dialog dependency for the rest of the app (the `object-mapping-readonly` delete dialog uses it directly today and benefits from the same `[overflow-wrap:anywhere]` rule shipped at that layer). Forking would mean either porting the same chrome decisions back into `@usertour/alert-dialog` (so two primitives stay in sync) or losing the overflow rule for `object-mapping-readonly`.
- **Rejected because:** the layering cost is real and the supposed benefit (one fewer composition layer) is minor.

### Alt-E: Provide chrome customization props (`headerSlot`, `iconOverride`, `contentClassName`)

Let consumers customize the small things they want while still inheriting most of the shell.

- **Costs:** every escape-hatch prop is a future divergence vector. The eight current consumers don't need any of them — every one of them is happy with the shared chrome. Adding props for hypothetical future consumers is the "theoretical UI guard rail" pattern that this codebase has explicitly rejected.
- **Rejected because:** if a real future consumer needs a different shape, the right answer is to write a sibling primitive (or evolve this one through a separate ADR), not to make the shared primitive endlessly configurable.

## Triggers to Revisit

Reopen this decision when any of:

- A destructive flow needs a fundamentally different shape (multi-step danger flow, type-the-resource-name-to-confirm à la GitHub repo deletion, inline form field for a reason). At that point, write a sibling primitive (e.g. `TypedConfirmDialog`) rather than retrofit a slot system onto this one. This ADR remains valid for the eight existing consumers.
- A non-settings surface (builder, SDK, future apps) needs destructive confirmation and the chrome decisions here turn out to be settings-specific (e.g. max-w-xl is too wide for a 320px sidebar dialog). At that point, decide between a separate primitive for that surface and a parameterized version that covers both.
- The `@usertour/ui` no-business-knowledge invariant is itself revisited (e.g. the whole codebase adopts a different i18n posture, or `@usertour/ui` absorbs i18n). At that point, the consumer-passes-strings choice in this ADR collapses into "the primitive does it itself", and most of the per-consumer `<Trans>` wrappers become removable.
- A subsequent UX refresh changes the visual treatment of destructive actions across competitive SaaS (e.g. the convention moves away from the red-badge pattern toward something else). At that point this ADR's chrome decision is restated, not the consolidation itself.

## Implementation reference

Landed on `feat/v0.8.2`, commits `b8d6f72c` (initial action-named delete copy + icon badge + max-w-xl), `2142b64c` (transfer-ownership applied to the same template, still as bespoke chrome), `dc396586` (rename `DeleteConfirmDialog` → `DestructiveConfirmDialog`, member dialogs rewritten as thin wrappers, doc comment updated). Today the primitive lives at:

```
packages/components/ui/src/ui/settings/destructive-confirm-dialog.tsx
```

Re-exported from `@usertour/ui` via `packages/components/ui/src/ui/settings/index.ts`. The eight consumers are:

```
apps/web/src/pages/settings/
  api/components/api-row-actions.tsx              # API key delete
  attributes/components/attribute-delete-dialog.tsx
  environments/components/environment-delete-dialog.tsx
  events/components/event-delete-dialog.tsx
  localizations/components/localization-delete-dialog.tsx
  themes/components/theme-delete-dialog.tsx
  members/components/member-remove-dialog.tsx
  members/components/member-transfer-owner-dialog.tsx
```

The primitive's own JSDoc holds the day-to-day usage example (canonical title / description / confirmLabel wiring with `<Trans>` for inline bold name); this ADR holds the architectural _why_ and the trigger conditions for changing it.
