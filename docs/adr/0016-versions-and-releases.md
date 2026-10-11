# ADR 0016: App versions and releases

Status: Accepted (owner decision of 2026-10-11).

## Context

Until now an APK was a CI artifact named after a run number and a commit
(`flourprint-<run>-<sha>.apk`), whatever the branch. Artifacts expire, nothing says which one is
current, and a pull request's APK looked like any other. The owner wants the normal APK to come
from `main` only and to be published as a GitHub release, and the dev channel to follow the open
major pull request (ADR 0013).

## Decision

### One app version

- The app has **one version**, `MAJOR.MINOR.PATCH` ([Semantic Versioning](https://semver.org/)), in
  the root `package.json` (`version`). The packages' own `version` fields stay `0.0.0`: they are
  not published.
- `0.x` while Dogfood Alpha is not reached. `0.1.0` is the proof-of-concept baseline (PR #31, merge
  `240450f`).
- **MINOR** grows when a major pull request (`dev` → `main`) is merged; **PATCH** when a fix goes
  to `main` directly. `1.0.0` is an owner decision.
- `dev` always carries the **next** version: the major pull request sets it when it opens.
- The app version is independent of the contract, engine and model versions (`CONTRACT_VERSION`,
  `ENGINE_VERSION`, `ModelRef`), which keep their own rules and are listed in the release notes.

### Build names

`scripts/build-id.mjs` derives, for every CI job, from the root version, the branch and the run:

| Build                     | Version name (shown in Advanced and the feedback export) |
| ------------------------- | -------------------------------------------------------- |
| `main`                    | `0.2.0`                                                  |
| `dev`                     | `0.2.0-dev.<run>+<sha7>`                                 |
| pull request `<n>`        | `0.2.0-pr.<n>.<run>+<sha7>`                              |
| local (no CI environment) | `0.2.0-local`                                            |

Android `versionCode` = `MAJOR × 1 000 000 + MINOR × 1 000 + PATCH`, so a newer release always
installs over an older one. Dev builds have their own application id (ADR 0013) and never
conflict with it.

### Releases

- A push to `main` whose version has no tag yet publishes a **GitHub release** `v<version>`. It
  holds `flourprint-<version>.apk` (the normal, offline APK), the Windows desktop shell zip, and
  notes that link the major pull request and list the contract, engine and model versions.
- A pull request into `main` must raise the version above the latest release tag; CI checks it.
- A push to `dev` replaces the rolling pre-release **`dev-channel`**, holding
  `flourprint-dev.apk`. The dev APK loads `https://dev.flourprint-aristotelesqc.pages.dev`, so it
  rarely needs reinstalling; the release page is its stable download link.
- Pull requests publish no release; their APKs remain CI artifacts for testing only.

### Signing

Released APKs are signed with the committed debug key, the same key as every APK installed so
far, so a release installs over the owner's current app without losing data. It is not a secret
key and is not fit for public distribution. Moving to a private release key (stored as GitHub
secrets) requires reinstalling once; data is carried over with Advanced → copy all data, then
import. That move is an owner decision, made before any distribution beyond the owner.

## Consequences

- The normal APK has one source, `main`, and one download place, the releases page.
- Every build says what it is: a release, the dev channel or a pull request.
- Merging a major pull request is also a release; its body serves as the release notes.
