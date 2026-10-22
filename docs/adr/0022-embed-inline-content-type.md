# 0022: Embed, an inline multi-instance content type

- **Date:** 2026-10-21
- **Status:** Accepted

## Context

A prospective self-managed customer asked for two things in September 2026: eight to ten upsell cards on one page at the same time, each tied to a gated feature, and a "lock overlay" on specific elements, with per-user seen / dismissed state and a record of who clicked which button and when. They were trying to build it with banners.

Our banner cannot do it, and should not. Banner is in all three concurrency sets the delivery layer keeps (`SINGLETON_CONTENT_TYPES`, `SHOW_ONLY_CONTENT_TYPES`, `SINGLE_SESSION_CONTENT_TYPES`): one at a time, chosen by priority, one session per user for life. That is the contract of the banner category across the industry, not a gap in our model. Banner also has no button-click event; a button that navigates leaves no trace unless it also dismisses. Launcher is an icon plus a tooltip, and tracker has no interface at all, so neither is a substitute.

The request is one instance of a category: **content embedded in the host application's layout**. Upgrade and gating cards, "what's new" cards inside the relevant area, getting-started cards in empty states, explanatory cards on settings pages, inline surveys that recur, campaign cards with a time window, follow-up nudges after an event, and small multi-step guides that stay inside one container. One competing product ships this as a first-class type beside its banner, with the same motivation. It is table stakes for the category, so it is built as a type with those uses in mind, not as a fix for the one request.

The "lock" half of the request is declined as a product feature. An asynchronous script cannot gate anything: the host paints before the script mounts, an ad blocker or a deleted node exposes the original, and the gated DOM is still there. We inject content at a position; the host application enforces access. The customer was told so.

Three questions took the discussion, and this record exists mainly for them: what the type is in the abstract (so the next inline request does not become "make X multi-instance"), where its steps live, and which delivery rules it gets.

## Decision

### 1. Definition and sources

**Embed = inline placement + parallel multi-instance + in-container multi-step.** It is a new content type `EMBED`; banner is unchanged, including its element-level placements. The overlap in the single-element case is accepted and resolved by semantics in the documentation: a banner is an announcement that competes for one slot by priority; an embed is content that belongs to the layout, and every embed a user qualifies for shows at once.

The type is assembled from three existing models, deliberately, and nothing else is copied:

| Concern | Taken from | What is reused |
|---|---|---|
| Content model | flow | steps are `Step` rows; the content editor, cvid, localization, triggers, `currentStepId` |
| Rendering shell | banner | mounting at a position, element watching, the iframe frame, height measurement, the non-iframe builder preview |
| Delivery | launcher | the batch path, per-type session arrays, incremental and full-state sync, add / remove messages |

What separates embed from flow and checklist is **the delivery mechanism, not whether the content has several steps**: flow and checklist are guided, one at a time, arbitrated by priority and frequency, and move across the interface; embed is parallel and stays inside its container. An inline rendering of a flow or a checklist, if ever wanted, is a placement option of those types, keeps their singleton semantics, and is not an embed.

### 2. Data model

- `Content.type = EMBED`. `Version.data` holds only the shell: `placement`, `targetElement`, `allowUsersToDismiss`, `zIndex`, `maxContentWidth`, `outerMargin`. These are layout decisions per content; everything that is appearance lives in the theme (§6). Flow does not use `Version.data`, so the field is free.
- A step is a `Step` row. `StepContentType` gains `INLINE`; an embed may contain `INLINE` and `HIDDEN` steps (hidden = render nothing, advance on a trigger). A constants matrix `STEP_TYPES_BY_CONTENT_TYPE` declares which step types each content type accepts, and the builder, the validators and the public API read it. No new table, no migration. Localization keyed by `step.cvid`, step triggers, and the per-session current step all work unchanged. Steps carry no anchor, no popup settings and no progress semantics; the per-session current step is remembered so a hidden-then-shown embed resumes where it was, and nothing more.
- Five placements: top of container, bottom of container, before element, after element, and **COVER**. The first four insert the embed into the document flow. COVER positions it absolutely over the target element and sizes it to the element; the element's DOM is untouched, the host keeps rendering, and the user sees our card. COVER is the position for gating cards; it is content injection, not an access control. Page-level placements are banner's and are not offered. Banner's overlay, sticky and reveal-animation flags are not carried.

### 3. Delivery rules

**Visibility is level-triggered.** The content's rules are "Show embed if…", evaluated on every toggle the way the batch path already evaluates launchers: an embed is visible while the user matches and the target element exists, and disappears the moment either stops being true. A user who upgrades stops seeing the upgrade card without dismissing it. Flow's auto-start semantics, where a started session persists after the conditions stop matching, are wrong for audience-gated content and are not used.

**No hide rules.** Under level-triggered visibility, "show if A, hide if B" is "show if A and not B"; hide rules exist for flow because its start rule is edge-triggered and stops applying once the session runs. Embed has one rule set.

**Re-entry is governed by frequency, not by a lifetime single session.** Embed is not added to `SINGLE_SESSION_CONTENT_TYPES`. Instead it uses the flow's frequency setting: `once` (default), `multiple` with a count and a minimum gap, or `unlimited` with a minimum gap. Dismissal always and only ends the current session; frequency decides whether a new one may start on a later qualifying page load. This one setting covers both "closable forever" (`once`) and "closable until next visit" (`unlimited`), and it enables recurring inline surveys and reminders. The batch path's lifetime filter (`filterSingleSessionContentVersions`) is replaced for embed by the frequency filter it already calls for other types, with one rule the batch path did not need before: the frequency check governs *starting* a session, never *keeping* one. The path re-evaluates every live session on every sync, and a running session counts toward its own `once`, so a version whose session is active is exempt from the frequency check and judged on its show rules alone.

The capability row is a new combination: frequency on; `atLeast` off (it is a quiet period measured against *other* content of the same type, which contradicts a type whose premise is that several show together and whose events fire continuously); `priority`, `wait`, hide rules and `ifCompleted` off. Priority has no job without arbitration; `wait` on inline content is a layout shift; there is no completion state.

Server side: `SocketData.embedSessions[]`, `ADD_EMBED` / `REMOVE_EMBED`, full-state sync removes sessions that no longer qualify, incremental sync for a single content keeps the others. Hiding sends the existing cancel, which keeps the session, so the current step and the dismissal memory survive hide / show cycles. Several embeds on one target element stack in the path's existing order; two COVER embeds on one element are an authoring error and are not arbitrated.

### 4. Events

Three new default events, in the per-type vocabulary every other type uses:

- `embed_seen`, once per session (`SINGLE_OCCURRENCE_EVENTS`)
- `embed_step_seen`, once per session per step
- `embed_dismissed`, once per session (`DISMISSED_EVENTS`), with `embed_end_reason` = `dismiss_button` / `action_dismiss` / `admin_ended`

One **generic** event, `button_clicked`, fired on every button press. A button is an editor block, and `question_answered` already set the precedent for block interactions: named after the interaction, base attributes taken from the session's content type. `button_clicked` carries the session type's base attributes, the step attributes, `button_cvid` and `button_text`. The cvid lives in the button's data, exactly as a question's does: assigned when the button is created, kept across text edits and translations, regenerated when a step is duplicated. (The editor's root element ids were considered and rejected: the builder strips them on every save and regenerates them on open, so they identify nothing.) Flow, banner and checklist can adopt it later without a schema change. The production database was checked before choosing the name: no project had defined it, and user-defined click events are named after their target (`search_clicked`, `items_clicked`). Because the default-event backfill adopts an existing event of the same code name silently, the backfill logs a warning with the project id when that event is user-defined, so a self-hosted operator sees the collision.

`question_answered` is reused. Its payload builder spreads the flow base attributes unconditionally today; it selects the base by `session.content.type`, and the event definition's attribute list gains the embed base attributes. `answerQuestion` moves from the tour component to the shared component base so embed steps can host question blocks.

New attributes: `embed_id`, `embed_name`, `embed_version_id`, `embed_version_number`, `embed_session_id`, `embed_start_reason`, `embed_end_reason`, `embed_step_id`, `embed_step_cvid`, `embed_step_name`, `embed_step_number`, `button_cvid`, `button_text`.

Registrations: `SINGLE_OCCURRENCE_EVENTS`, `DISMISSED_EVENTS`, `SYNC_TIMELINE_EVENTS` (gains `button_clicked` as the engagement milestone; step-level events never leave, per ADR 0013), the two tables that derive a content type from the `*_id` attribute present (integration adapters, activity feed), the analytics queries that hard-code `flow_step_cvid` (they take the attribute key per type), the project-default seed and the backfill of existing projects (ADR note on default events: every new default event is backfilled or analytics for existing projects is permanently empty).

Flow's lifecycle events are not reused: the `*_id` tables above would classify embed activity as flow, the step-seen handler emits `flow_completed` at full progress, and segments, webhooks and integrations filter by event name.

Not defined: `embed_completed` (no completion state) and a target-missing event (launcher and banner have none; a candidate, see Triggers).

### 5. Analytics

The top-level vocabulary follows resource center, because the session model is the same: a long-lived session whose "total" would collapse into "unique", and a success action that is a click. The content level follows flow, because its steps are `Step` rows.

- Start / success events: `embed_seen` → `button_clicked`. Overview cards: unique views (first-touch, as for banner and launcher), unique clickers, click-through rate, dismissals. The performance chart plots views and clickers.
- Steps table: the flow step table (`AnalyticsSteps`) without the tooltip-missing column and the goal badge, rendered only when the version has more than one step; a one-row table repeats the overview card.
- Buttons table: new, modelled on the resource center block table. The server reads the published version, collects the buttons of every step, and counts unique and total clicks per button keyed by `embed_step_cvid` + `button_cvid`; the button text is the label. Grouped by step.
- Questions: the existing question analytics apply unchanged (keyed by question cvid, iterating `version.steps`).
- Counting: `embed_seen` and `embed_step_seen` are once per session, so **impressions are not counted** and there is no "total views". A persistent inline card's impressions are page views, and every page load of every card would write an event into the table the SDK's rule evaluation reads. With frequency, total views means sessions, as for flow. Clicks count events. Click-through rate counts any button, including step navigation; the buttons table separates them.
- Sessions: status dismissed / clicked / active; the progress column shows the current step for multi-step embeds; the session detail progress card lists steps seen and buttons clicked. The activity feed needs no change beyond the `*_id` table.
- Public API v2 and the MCP analytics tool get an embed shape: users, clickers, dismissals, by day, steps, buttons.

### 6. Theme

A new `embed` section with three fields: `backgroundColor`, `textColor` (both allow Auto), `padding`. Auto resolves to the **main** color, not the brand color: an embed is content in the layout, and the card look is the right default; the banner section's Auto resolves to the brand color because a banner is a notice. Border radius and border come from the shared `border` section, as for modal and tooltip, which is why the shell data carries no `borderRadius`. No width (an inline embed fills its container; `maxContentWidth` is per content), no reveal animation, no progress bar. The theme builder gets an Embed preview widget and the CSS variables `--usertour-embed-*`.

### 7. SDK, widget and builder

- The widget's banner internals are extracted into `packages/widget/src/core/inline.tsx` (`InlineRoot`, `InlineFrame`, `InlineInFrame`, `InlineContentContainer`, `InlineDismissButton`, `InlinePreview`); the banner components become thin wrappers and keep their exports. The SDK's mount helpers are shared and gain the COVER branch, re-measuring on target size changes. The SDK keeps `embeds[]` as it keeps `launchers[]`.
- Button actions: go to step (a named step, exactly as in a flow; a relative previous / next was built and then removed on 2026-10-22 so the two step-bodied types stay one model), dismiss, navigate, start a flow, run JavaScript. Step triggers are reused.
- The builder is the flow builder's restricted variant: the same routes, a sidebar of theme + embed settings (placement, target element, dismiss, size) + step list + "add step" defaulting to `INLINE`, the step detail's `INLINE` branch, and a canvas preview that places the inline shell inside a browser frame with a placeholder target. The step editor hook is lifted into a shared core.
- Content settings page: "Show embed if…" and frequency, per the capability row.

### 8. Compatibility

The handshake gains `SocketAuthData.capabilities: string[]`. The server does not deliver embeds to an SDK that does not declare the capability; an older SDK would ignore the unknown message kinds anyway, but not delivering is cheaper than relying on that.

## Consequences

- A full content type's surface: type and constants, server batch path and frequency filter, events and backfill, analytics (server, dashboard, API v2, MCP), widget extraction, SDK, builder, theme section and preview, documentation and localization strings. Estimated at four weeks in three milestones (core / server / SDK / widget; builder / web / theme; analytics / API / seed / docs).
- Banner and embed overlap on single-element placements. Accepted; documentation points element-level content at embed.
- A multi-instance type with frequency is new ground: until now the lifetime filter was the only thing keeping launcher and banner at one session, and the frequency filter has only run for singletons. The test matrix must cover `once` / `multiple` / `unlimited` under the batch path's full-state and incremental syncs.
- Event volume stays bounded: three once-per-session events plus clicks. The price is that impression counts are not available.
- `button_clicked` is a generic name in a per-type vocabulary. The collision check covers Cloud; self-hosted instances are covered by the backfill warning only. Every built-in event name is also reserved on the custom-event ingestion paths, so a customer can no longer define or `track()` their own `button_clicked` after the upgrade.
- COVER will be read as a lock by some customers. The documentation states what it is.
- The banner internals move; the extraction must leave banner's exports and behaviour byte-for-byte unchanged, verified against the builder preview and the SDK.

## Alternatives Considered

### A. Make banner multi-instance

Rejected. Singleton-by-priority is the banner category's contract and is wired into the server's concurrency sets and the SDK's single `activatedBanner`; loosening it would cost every banner user the arbitration they rely on and still leave the type without a click event or multi-step content.

### B. A lock / overlay feature

Rejected, see Context. The product cannot enforce access from an asynchronous script; COVER places content at the gated position and the host enforces.

### C. Render a flow inside a container

Rejected. It keeps flow's singleton delivery, and the request needs several at once. Multi-step content inside a bounded slot is paging, not a journey; it belongs to embed, with the per-session current step as its only memory.

### D. Steps as a JSON array in `Version.data`

Rejected after being proposed. Sibling types store their bodies as JSON, but embed's content model is flow's, and flow's model is `Step` rows. Rows give cvid, localization, `currentStepId` and triggers for free; a JSON copy would re-implement each and drift.

### E. Flow's start rules plus hide rules

Rejected. Edge-triggered start keeps an upgrade card on screen after the user upgraded; hide rules would then be the only level-triggered knob and would duplicate what level-triggered show rules already express.

### F. Lifetime single session with permanent dismissal only

Rejected after being the September plan. It cannot express a recurring inline survey or a reminder that returns after a week, both ordinary uses of the category. The frequency setting already exists and the batch path already calls its filter.

### G. A type-specific `embed_button_clicked`

Rejected in favour of the generic name, with the collision check and the backfill warning as the safeguards. A per-type name would need a deprecation cycle in the public vocabulary the day flow or banner wanted button clicks.

### H. Count impressions

Rejected. Impressions of a persistent card are page views; writing them inflates the event table that rule evaluation reads, which was the cause of a recent second-scale latency. Unique reach, clicks and dismissals answer the questions the category asks.

### I. A priority knob for same-target collisions

Rejected. Stacking in the existing order is deterministic; a knob every author sees, for a case that is an authoring error when it matters (two covers on one element), is a guard rail for a theoretical case.

## Triggers to Revisit

- A self-hosted operator reports a `button_clicked` collision in practice.
- Customers ask for impression counts on embeds; the answer would be a sampled or aggregated counter, not raw events.
- Demand for a completion state or a "show until completed" frequency on multi-step embeds.
- Demand for a target-missing diagnostic for element-anchored types; it would be designed for launcher, banner and embed together.
- Flow or banner adopts `button_clicked`; the buttons table then becomes a shared analytics component.
- A request for page-level inline placement, which would reopen the banner / embed boundary rather than extend embed.
