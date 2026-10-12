# ADR 0015: Persistent data in the browser preview

Status: Accepted (owner request of 2026-10-11).

## Context

The web preview (ADR 0013) keeps its stores in memory: every reload loses the recipes, drafts,
flours and bakes the owner set up. The dev APK does not have this problem: it runs the remote web
build inside the native shell, with Capacitor SQLite on the phone. The owner wants the browser
preview to keep its data across reloads, without that data or its mechanism reaching the
end-user APK.

## Decision

- In a browser (no Capacitor native platform, no desktop bridge), the memory stores are
  **restored at start-up** from a snapshot saved in the browser's IndexedDB, and **saved** as a
  new snapshot whenever their content changed: checked every few seconds and when the page is
  hidden or closed.
- The snapshot is the full backup document (`exportBackup`, persistence.md), restored through the
  normal decoding and restore path (`importBackup` into memory targets), so the preview follows
  every contract a backup follows. A snapshot that does not decode is kept aside under another key
  and the app starts empty, saying so.
- The data stays in that browser profile on that device: nothing is sent to Cloudflare or anywhere
  else. Advanced → "Effacer les données du navigateur" deletes the snapshot; copying all data
  (history.md) works as before.
- On Android and in the desktop shell nothing changes: they use SQLite and never read or write the
  browser snapshot. The code path is chosen at run time by the same platform test that already
  picks the stores.
- Server-side storage on Cloudflare (D1 or KV) to share data between browsers and the phone is not
  part of this decision: it would need an API, authentication and a sync model. It can be decided
  later.

## Consequences

- Reloading the preview keeps everything. Clearing the browser's site data erases it.
- **Durability is that of a preview, not of SQLite** (audit FP-AUD-008, 2026-10-12). The snapshot
  is saved at most every few seconds and when the page is hidden; a browser or tab killed in
  between can lose the last few seconds of changes. Android and the desktop shell commit each
  change to SQLite in a transaction. Real bakes belong in the app, not the preview.
- A snapshot written by a newer version may not decode in an older preview; it is kept aside, not
  overwritten.
