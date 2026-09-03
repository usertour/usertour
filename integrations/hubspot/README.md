# Usertour HubSpot app

This directory is the HubSpot **app project** that registers Usertour as a HubSpot app. It contains configuration only — no code runs inside HubSpot. All sync logic lives in the Usertour server; this project tells HubSpot who we are, which permissions to request when a customer clicks *Connect with HubSpot*, where to send them back, and how Usertour events look on a contact's timeline. CRM changes are not pushed to us: the server pulls them from HubSpot's webhooks journal API, so no public inbound URL is needed.

It is deployed with the [HubSpot CLI](https://developers.hubspot.com/docs/developer-tooling/local-development/hubspot-cli/install-the-cli) (`hs project upload`) and is intentionally **outside the pnpm workspace**, like `integrations/zapier`.

## Layout

| File | Purpose |
|---|---|
| `hsproject.json` | Project name, source dir, HubSpot platform version |
| `src/app/app-hsmeta.json` | App identity, OAuth settings (redirect URLs, scopes), distribution, support links |
| `src/app/app-events/*-hsmeta.json` | Timeline event templates: how each Usertour event renders on a contact or company record |

## Cloud vs. self-hosted

**Usertour Cloud** uses the app deployed from this directory by the Usertour team. Nothing to do.

**Self-hosted instances cannot use the Cloud app**: OAuth redirect URLs are registered on the app and point at `api.usertour.io`, and the app's client secret is private to it. A self-hosted deployment uploads its **own copy** of this project to its own HubSpot developer account, so that authorization returns to its domain.

### Self-hosted setup

1. Create a free [HubSpot developer account](https://app.hubspot.com/signup-hubspot/developers) and install the CLI: `npm install -g @hubspot/cli@latest`, then `hs auth` and pick the developer account.
2. Copy this directory and edit `src/app/app-hsmeta.json`: set `distribution` to `"private"`, and replace the redirect URL with `https://<your-api-host>/integrations/hubspot/oauth/callback`. It must be HTTPS; it only needs to be reachable by the browser of the person connecting, not by HubSpot's servers.
3. `hs project upload`. On the first upload HubSpot creates the app in your developer account.
4. In the developer account, open the app → **Distribution** and add your HubSpot account to the allowlist (private apps can be installed in up to 10 allowlisted accounts). Copy the **Client ID** and **Client secret** from the app's Auth settings.
5. Set them on the Usertour server and restart:

   ```
   HUBSPOT_CLIENT_ID=...
   HUBSPOT_CLIENT_SECRET=...
   ```

6. In Usertour, go to **Settings → Integrations → HubSpot** and click *Connect with HubSpot*.

Re-run `hs project upload` whenever you change the configuration; the app updates in place.

## Maintainer notes (Cloud)

- Platform version is pinned in `hsproject.json`; only the project-based platform is used — no legacy app features.
- `distribution` is `marketplace`. Before the App Marketplace listing is approved, the app can be installed in at most 25 accounts (10 while still private); after approval, unlimited.
- Changing scopes changes what existing installs must re-authorize; treat scope additions as a versioned change and document them in the docs site.
- The OAuth callback route is served by `apps/server` (`/integrations/hubspot/oauth/callback`); keep this config and the server route in lockstep.
- Incremental changes come from the webhooks journal API (app-level client-credentials token, `developer.webhooks_journal.*` scopes) — nothing to configure here.
- Timeline events use app events (`src/app/app-events/`), which HubSpot enables per app on request; the directory is added once access is granted.
