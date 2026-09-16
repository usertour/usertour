# 0014: Roles — VIEWER ⊂ EDITOR ⊂ ADMIN ⊂ OWNER and the editor publish whitelist

- **Date:** 2026-09-15
- **Status:** Accepted

## Context

Project membership had three roles: VIEWER, ADMIN, OWNER. The capability matrix behind them (`ROLE_CAPABILITIES`, introduced by the permission refactor) had three tiers: READ for everyone, WRITE for ADMIN and OWNER, and OWNER_ONLY for everything else — team, billing, project settings, integrations, webhooks, access tokens, SSO, audit. ADMIN was therefore exactly READ + WRITE: an editor by any other name. Every administrative surface belonged to the single, non-invitable OWNER.

That shape was not designed; it accreted. The original open-source roles were ADMIN / USER / OWNER, with OWNER meaning "creator and payer". VIEWER was added later and USER fell out of use (kept in the Postgres enum, dead everywhere else). Each management feature that shipped afterwards — SSO, environment tokens, webhooks, integrations, the audit log — went into OWNER_ONLY by default, and the refactor deliberately preserved the historical role sets, so the gap between the name "Admin" and its power kept widening.

The consequences were concrete:

- A project has one person who can invite, rotate a token, configure a webhook, or see whether a CRM sync failed. When that person is away, nobody can.
- An ADMIN could create and delete environments (including production) yet could not read an environment's token to install the SDK.
- An ADMIN could publish to production and delete end users, yet could not read the audit log.
- Webhook and integration failure notifications went only to the OWNER.

We compared the invite and role surfaces of five products before deciding: an onboarding tool with Admin / Editor / Viewer where an Editor publishes only to permitted environments and an Admin may optionally manage users; an analytics platform with Member / Admin / Owner at organization level plus paid, per-project and per-resource access control and custom roles; a CRM with no fixed ladder at all (roles are permission bundles assignable to members, agents and API keys, and the "owner" is only a set of lock-out guards); an issue tracker with Admin / Member / Guest, an Enterprise-only Owner, and per-team access; and another onboarding tool with Editor / Publisher / Admin under a fixed Account Owner, scoped by project. Every one of them is a fixed ladder plus one orthogonal scope axis (environment, project, or team); custom roles appear only as an enterprise add-on.

A dormant column already existed for the scope axis: `UserOnProject.allowedEnvironmentIds`, mirrored on `Invite`, read by the permission guard as a general environment restriction ("this member may act on these environments") and by personal API keys as a ceiling — but with no writer anywhere in the product.

## Decision

### 1. Four nested roles

`VIEWER ⊂ EDITOR ⊂ ADMIN ⊂ OWNER`, strictly nested. Admin, Editor and Viewer are invitable. OWNER is unique per project, never invitable, and only ever assigned by ownership transfer (which demotes the previous owner to ADMIN).

The Postgres enum value `USER` is renamed to `EDITOR` with a hand-written `ALTER TYPE "Role" RENAME VALUE` migration — metadata-only and transaction-safe — rather than the destructive drop-and-recreate Prisma generates for enum changes.

### 2. Four tiers, drawn by consequence

| Tier | Roles | Contents |
|---|---|---|
| READ | all | every read, project activation, subscription and usage reads |
| WRITE | EDITOR, ADMIN, OWNER | content, theme, attribute, event, localization and segment CRUD; content publish (see §3); user and company write and delete; session management; environment create / update / delete; integrations; webhooks; environment access tokens, signing secrets and the identity-verification toggle |
| ADMIN | ADMIN, OWNER | publish to any environment; team management; SSO configuration; project name and logo; audit log; billing read |
| OWNER_ONLY | OWNER | billing management (license, checkout, portal); ownership transfer |

The line between WRITE and ADMIN is drawn by what a capability *changes*, not by where its page sits in Settings. Anything that only affects the project's own operation — connecting an analytics or CRM integration, wiring a webhook, reading the SDK token to install it, rotating a signing secret, adding an environment — is WRITE, so a builder can finish their work without asking anyone. Anything that changes **who gets in** (team, SSO) or **costs money** (billing) is ADMIN or OWNER.

The ADMIN tier ships in two steps (§7); at the first step it holds only `content:publish-any-environment`.

### 3. The editor publish whitelist

`UserOnProject.allowedEnvironmentIds` becomes the EDITOR **publish whitelist**: the set of environments an editor may publish to (and unpublish from). It has exactly one semantic — a set — and is consulted in exactly one place: when the required capability is `content:publish` and the role does not also hold `content:publish-any-environment`. Reads and every other write are never environment-restricted by membership.

- The whitelist is chosen when a member is invited or their role is changed, as a set of checkboxes shown only for Editor. The default is none checked: an editor with no whitelist edits everything and publishes nothing.
- ADMIN and OWNER are exempt by capability, not by a null in the column. A missing or non-array value is an empty whitelist, never "all environments".
- Roles other than EDITOR carry no whitelist; a role change rewrites the column so a member promoted out of EDITOR drops their list and one demoted into it starts from what the caller chose.
- Deleting an environment strips it from every whitelist (an emptied list stays `[]`). Creating an environment adds it to nobody's whitelist.
- A personal API key inherits its owner's whitelist as a **publish ceiling** (`E1039`) but no longer as a general environment ceiling: the key's own `allowedEnvironmentIds` remains the only environment scope for reads and other writes, and `/v2/me` lists environments by that scope alone.

`ApiToken.allowedEnvironmentIds` keeps its original full-scope meaning. The two columns share a name and no longer share a semantic; the membership column's comment says so.

### 4. Team management rules

- ADMIN may invite, change the role of, and remove any member who is not the OWNER, including other ADMINs.
- Nobody but the OWNER may make an OWNER, and only through the transfer flow. Ownership transfer becomes its own mutation with its own capability; `changeTeamMemberRole` stops accepting `OWNER` as a target role, and the OWNER's own row cannot be changed or removed through the team endpoints at all (the removal half already held; the role-change half is new, server-side).
- There is no rule against changing or removing yourself (§ Alternatives).

### 5. Migration of existing members

Every existing ADMIN membership becomes EDITOR with a whitelist of the project's live environments at migration time (an explicit list). Pending ADMIN invites and SSO settings whose default role is ADMIN are rewritten to EDITOR the same way. Nobody holds the new ADMIN role after the upgrade; owners promote deliberately.

This is **not** a zero-change upgrade. A migrated member gains integrations, webhooks and environment tokens, which were OWNER-only before. We accept it because nothing gained exceeds what those members already held — they could already delete environments and publish to production — and none of it touches who gets in or money. The change is listed in the release notes; existing members are not emailed.

### 6. Connected changes

- SSO auto-provisioning assigns EDITOR by default and may assign only EDITOR or VIEWER (a JIT-created editor starts with an empty whitelist). The admin panel may assign ADMIN, EDITOR or VIEWER.
- Webhook and integration failure notifications go to ADMINs as well as the OWNER.
- The subscription page hides upgrade and portal actions behind billing management once billing read reaches ADMIN.
- The baseline snapshot test that pinned every endpoint's role set is re-anchored to the new matrix as a declared, intentional change.

### 7. Delivery

Two pull requests, each shippable on its own:

1. Rename USER to EDITOR; add the EDITOR matrix row; move integrations, webhooks and access tokens into WRITE; add `content:publish-any-environment`; migrate memberships, invites and SSO defaults; publish-whitelist writers and guard semantics; the three-role invite and change-role dialogs.
2. Fill the ADMIN tier (team, SSO, project settings, audit, billing read); the OWNER-row check on role changes; the ownership-transfer mutation; notification recipients.

After step 1, no member holds ADMIN, so step 2 widens nobody's access until an owner promotes someone.

### 8. Discipline

Behavior is decided only by capability: `roleCan(role, capability)` on the server, `can(capability)` in the web app. Code compares a role name only in assignment logic (who may be assigned what). This is what keeps custom roles a pure addition later: a stored capability set per role, the four system roles as non-editable presets, OWNER and the publish whitelist untouched outside the matrix.

## Consequences

- A project no longer has a single point of failure for administration; a builder can install the SDK, wire a webhook and connect an integration without escalation.
- "Can edit but must not ship to production" is expressible without a fourth invitable role, and "this senior editor may ship to production, that one may not" is expressible per member.
- Existing ADMIN members are relabeled Editor and gain three operational capabilities on upgrade (§5).
- Editors invited before an environment existed cannot publish to it until an admin updates their whitelist.
- Two columns named `allowedEnvironmentIds` carry different semantics (membership: publish whitelist; token: full environment scope).
- Billing management stays with the single OWNER, so when usage hits the plan limit an ADMIN can see it but cannot upgrade; this is the accepted cost of tying checkout and portal to the owner's own payment identity.

## Alternatives Considered

- **Keep three roles and only move capabilities into ADMIN.** Rejected: it fixes the OWNER bottleneck by recreating it one level down — a builder who needs the SDK token must be made ADMIN and thereby gains team management.
- **A separate Publisher role instead of the whitelist.** Rejected: a role is a capability bundle, and publish scope is an instance set (environments are user-created). Custom roles cannot express it either without a scope axis; every product with a scope axis asks for it separately from the role.
- **A per-environment "editors may publish here" toggle instead of per-member checkboxes.** Viable and simpler at invite time, but it cannot express per-member differences, and the per-member column, guard check and invite plumbing already existed. Kept as the fallback if per-member proves noisy.
- **Zero-expansion upgrade (ADMIN → EDITOR with integrations, webhooks and tokens left in ADMIN).** Rejected for the bottleneck reason above; the bounded expansion in §5 is the price.
- **Admin's team management as an optional per-member checkbox** (as one reference product does). Rejected: our ADMIN tier is heavier (SSO, tokens), so an owner who distrusts someone with invitations should not hand them SSO either; "full builder who cannot invite" is an Editor with every environment checked. Additive later if demand appears.
- **Multiple owners.** Rejected: with ADMIN properly empowered, OWNER's remaining exclusives are billing and ownership, which benefit from one accountable identity; the single-owner invariant is enforced in several places and transfer already covers succession.
- **Forbid changing or removing yourself** (a convention seen in the CRM's code). Rejected: self-demotion is harmless and reversible by the OWNER, and removing yourself is "leave project", which is legitimate. The invariant that matters is that the OWNER row moves only by transfer.
- **Billing management for ADMIN** (two of five references do this). Rejected for now: checkout and portal sessions are created against the OWNER's own Stripe customer.
- **Custom roles, resource-level access control, viewers exempt from seat limits.** Out of scope; the capability matrix is already the shape a stored custom role would take.

## Triggers to Revisit

- Support requests to give ADMIN billing management, or to make a specific editor's publish rights follow environments automatically.
- An enterprise customer asking for custom roles: the matrix moves to storage, the four roles become non-editable presets.
- Demand for "Admin without team management" (the optional checkbox) or for editors who may invite peers of equal or lower rank.
- Evidence that the integrations / webhooks / tokens expansion for migrated editors caused a real incident, which would argue for moving those back to the ADMIN tier with a proper deprecation notice.
