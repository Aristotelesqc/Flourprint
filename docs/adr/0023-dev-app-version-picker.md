# ADR 0023: Choosing the web version in the dev apps

Status: Proposed (owner decisions of 2026-11-04; awaiting the owner's approval of this pull
request). Amends ADR 0013 and ADR 0018 for the dev apps only; ADR 0015 is unchanged.

## Context

The dev APK (`app.flourprint.dev`) and the Windows Dev shell load one web address, the `dev`
address (ADR 0013). Trying a pull request that is not yet merged, the `canary` build (ADR 0018) or
`main` means opening that address in a browser, which has neither native SQLite, reminders nor
the phone-sized shell. The owner wants to choose the version from inside the dev apps.

Two facts found while preparing this decision shape it:

- **Data is not per address on Android.** ADR 0013 says each address keeps its own data. That
  holds for what the web view stores per origin (local storage, IndexedDB; the desktop shell's
  browser snapshot of ADR 0015). It does not hold for the dev APK's SQLite database: it is one
  native file set (`databases/flourprintSQLite.db`) opened by name, so every address loaded by the
  APK would open the same file. A pull request, or an older build of one, could migrate or change
  the `dev` data. Nothing in the web code can prevent this for a build that predates this ADR.
- **The web view cannot just navigate.** Capacitor injects its native bridge (SQLite, notifications)
  only into pages of the configured server origin; a navigation to another address would load a page
  with no plugins. The APK must restart its bridge on the chosen address.

The repository is public since ADR 0013 was written, so GitHub's REST API answers without
authentication (60 requests per hour per address).

## Decision

### Scope

- **Dev apps only**: the Android dev APK and the Windows Dev shell. Release builds (`app.flourprint`,
  the release shell, the offline APK) are unchanged: they register no native part of this feature,
  so the web app finds no host and shows nothing (a test proves it). A browser tab shows nothing
  either: the web app offers the picker only when a dev app provides the host.
- The picker is a section of the Advanced menu. The Windows shell keeps View → Version, which lists the same entries (it fetches the open pull requests too).

### Versions and addresses

| Version         | Address                                              |
| --------------- | ---------------------------------------------------- |
| `dev` (default) | `https://dev.flourprint-aristotelesqc.pages.dev/`    |
| `canary`        | `https://canary.flourprint-aristotelesqc.pages.dev/` |
| `main`          | `https://flourprint-aristotelesqc.pages.dev/`        |
| a pull request  | `https://pr-<n>.flourprint-aristotelesqc.pages.dev/` |

- **Allowlist.** Only these addresses load: scheme `https`, no user, password or port, the host
  exactly one of the four forms above, `<n>` a positive integer without leading zero (CI never
  produces another form, so each pull request has one canonical address). Anything else is refused
  by the web picker, by the Android plugin and by the Windows main process, each of which checks
  again. The page loaded is always the address's root. Tests and local builds keep their existing
  override of the `dev` address (`FLOURPRINT_DEV_URL`) for the `dev` version only.
- **`dev` shows `main`'s content when they do not differ.** ADR 0013 already deploys `main` to
  the `dev` address on a push to `main` when the `dev` branch is gone or contained in `main`. The
  default is therefore the right place to look at released work too; `main` stays selectable for
  the real `main` address.
- **Choosing.** The Advanced section has one dropdown listing every version that can be loaded,
  in this order: `dev`, `canary`, `main`, then each open pull request as "PR #<n> · <title>"
  (`GET /repos/Aristotelesqc/Flourprint/pulls?state=open`, without authentication), newest first.
  The loaded version is the selected entry (a pull request that is loaded but no longer listed is
  added so the selection stays truthful). Choosing an entry opens a short sheet: load it, or copy the data there first and load it. Only versions that really have
  an address are listed: "branches" means exactly `dev`, `canary` and `main`. CI also deploys a
  `<branch>` alias for a run started on demand on another branch (`ci.yml`, deploy step); those
  are ad hoc, cannot be enumerated and are outside the allowlist, so they are not listed. When the
  list cannot be fetched (offline, rate-limited, any failure) the dropdown holds the three fixed
  entries and a number field (digits, `#` tolerated) takes over for pull requests. The choice is
  kept across restarts (Android: app preferences; Windows: `settings.json`).
- **Always visible.** The section shows "PR #233 · <build label>" (or `Dev · …`), the label being
  the loaded build's own (ADR 0016), and one action returns to `dev`. A version older than this ADR
  has no picker: on Windows View → Version still returns to `dev`; on Android a dynamic launcher
  shortcut ("Return to dev", long-press on the icon) does, because the web page cannot.

### Data per version

- **Separate data.** Each version has its own data: the web view's per-origin storage, and on
  Android its own SQLite file set. The APK keeps one set per version in its private storage and
  puts the selected version's set where the plugin opens it, **at process start and before any
  connection exists**; switching version therefore restarts the app process. This is enforced
  natively and applies to every web build, whatever its code. `dev` keeps the existing file set, so
  installing the new APK over the old one loses nothing. A pull request starts empty and cannot
  alter `dev` data. The Windows Dev shell has no SQLite for remote pages, so per-origin storage is
  already per version (ADR 0015).
- **Copy my data to this version.** A native hand-off, because a page cannot read another origin:
  the current version exports its backup document (`exportBackup`, the same document as ADR 0015's
  snapshot) and gives it to the shell, which keeps it for the target version only and for ten
  minutes; the shell switches; the target version asks for it once at start-up and restores it
  through the normal restore path. The restore needs an empty target (persistence.md: backups
  restore into an empty database), so a version that already holds data refuses it and says so; the
  source is never modified. The pending copy is released to the target version's address only.
  This is direct, so no export-switch-import guided flow is needed. A target built before this ADR
  cannot receive it (the copy expires unused).
- **Delete this version's data**, with a confirmation, and a list of the versions that hold data on
  the device with their size, each deletable the same way. Deleting removes the web view's storage
  of that address and, on Android, that version's SQLite file set. Deleting the loaded version
  restarts the app (Android) or reloads the page (Windows) so no live connection is left over a
  deleted file.
- `dev`, `canary` and `main` are never deleted automatically.
- **Sizes.** Android: the size of the version's SQLite files. Windows: the size of the address's
  IndexedDB folder on disk. Web-view local storage (preferences, a few kilobytes) is deleted but
  not counted.

### Automatic clean-up

At start-up, for each pull-request version with data on the device **other than the loaded one**,
the app reads `GET /repos/Aristotelesqc/Flourprint/pulls/<n>`; a pull request that is `closed`
(merged or not) has its data deleted. Any failure (offline, 403 rate limit, 404, malformed answer)
deletes nothing. The loaded version is skipped because deleting it restarts the app into the same
version; it is cleaned at a later start-up once the user is elsewhere.

### Native changes

When a pull request is chosen (before it loads) and under the loaded version, the app reads `GET …/pulls/<n>/files` (up to
three pages of 100) and, if a changed path starts with `apps/mobile/android/`, `apps/desktop/src/`,
`apps/desktop/scripts/` or `apps/desktop/package.json`, or is `apps/mobile/capacitor.config.ts`, or
changes a Capacitor dependency in `apps/mobile/package.json`, shows a notice: loading its web build
cannot test that change; it needs an APK or a shell build. Best effort: a failure shows nothing.

## Alternatives rejected

- **Version-named databases chosen by the web code** (`flourprint-pr-233`): simpler, but an older
  build that still opens `flourprint` would use the `dev` data. Native isolation does not depend on
  the loaded code.
- **Navigating the web view to the chosen address**: the native bridge is not injected there.
- **One launcher entry per version / one APK per pull request**: unbounded installs and no switching.
- **A guided export, switch and import**: needed only if a native hand-off were not feasible. The
  existing "Copy all data" is a feedback export, not a restorable backup, so it could not carry
  the data back.

## Consequences

- Switching version on Android restarts the app. Open reminders are rescheduled by the web app
  after the restart, as after any cold start (ADR 0012).
- A pull request with native changes still needs its own APK (ADR 0013, ADR 0016).
- The native hand-off, the process restart, the shortcut and the file swap run on a device only;
  they are checked by the owner on a phone (the pull request lists exactly what was and was not run).
  The pure parts (allowlist, address building, clean-up decision, size listing, file swap on a
  temporary folder) are unit-tested.
- The unauthenticated API allows 60 requests per hour per address: one list request, one `pulls/<n>`
  request per pull request holding data at start-up, one to three `files` requests per selected
  pull request. When it is exhausted the features degrade as above.
- The Windows shell's main process gains a narrow bridge for the Dev shell, answered only to pages
  of an allowlisted address; the release shell gets none.
