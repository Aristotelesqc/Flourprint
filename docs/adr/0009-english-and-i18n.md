# ADR 0009: English as project language, localizable UI

Status: Accepted (2026-10-06)

## Context

The owner is French-speaking, and early backlog items were written in French. The project should
follow common open-source practice and remain usable by contributors and agents in any language.
The app itself must be able to support several languages.

## Decision

- **English everywhere in the project**: code identifiers, comments, documentation, contracts,
  ADRs, fixtures, commit messages, issues and pull requests.
- **Localizable UI from the first screen**:
  - No user-facing text is hard-coded in components; all strings go through message keys.
  - English is the source locale; other locales (French first) are added as message catalogs.
  - Numbers, units, dates and times are formatted per locale with the platform `Intl` APIs;
    numeric input accepts the locale's decimal separator (#23).
  - Pluralization and interpolation use ICU message syntax.
- **The engine stays language-neutral**: `DomainError.code`, error `details` and `Estimate`
  `reason`/`missing` are stable codes and data. `message` is English developer text, never shown
  as-is to users; the UI and CLI map codes to localized messages.
- User content (recipe names, notes) is stored as entered and never translated.
- The i18n library is chosen during #23, among libraries that support ICU messages and React.

## Consequences

Existing French issues stay as they are; new issues and comments are written in English. The CLI
is English-only at first; its messages still come from codes so it can be localized later.
