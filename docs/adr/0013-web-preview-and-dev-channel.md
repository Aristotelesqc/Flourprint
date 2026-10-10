# ADR 0013: A web preview link and a remote-loaded dev APK

Status: Accepted (owner decision of 2026-10-10).

## Context

Every change to the app needs a new APK installed on the phone to be tried. The owner wants to
open the latest version from a link. The repository is private, so GitHub Pages is not available
on its plan. The offline APK of Dogfood Alpha (step 7) must stay self-contained.

## Decision

- **Web preview**: CI builds the web app and deploys it to Cloudflare Pages, project
  `flourprint-aristotelesqc`, at `https://flourprint-aristotelesqc.pages.dev` (repository variable
  `FLOURPRINT_WEB_URL` overrides the address). The deploy runs only when the secrets
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist; otherwise it is skipped. In a browser
  the app keeps its data in memory and says so (unchanged).
- **Dev channel APK** ("Flourprint Dev", application id `app.flourprint.dev`): the same native
  shell (Capacitor, native SQLite, notifications), but its web view loads the web preview address
  (`server.url`) instead of the bundled build. Restarting the app picks up the latest deploy. It
  installs beside the normal APK and keeps its own data.
- The normal APK is unchanged: bundled, offline, the one for real bakes and step 7.
- A native change (a plugin, a permission, Capacitor itself) still needs the dev APK reinstalled.

## Consequences

- The dev APK needs the network at start and runs code fetched from the preview address: only
  the owner's own builds, served over HTTPS.
- The preview address is public but unlisted. The web build holds no personal data: recipes and
  bakes stay on each device.
