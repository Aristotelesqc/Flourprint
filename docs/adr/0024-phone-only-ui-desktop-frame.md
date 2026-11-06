# ADR 0024: Phone-only UI and the 1:1 phone frame on desktop

Status: Proposed (owner decision recorded in #118 and in ledger item L24; awaiting the owner's
approval of this pull request and answers to the open questions below). Relates to ADR 0011 and
ADR 0016; amends neither.

## Context

Independent UI reviewers and agents keep flagging two things as defects: the fixed phone-sized
frame that desktop browsers show, and the absence of responsive tablet or desktop layouts. Issue
#118 asks for an ADR so that both are recognised as intentional.

What the record says (every statement below is cited; nothing else is assumed):

- The interface is designed exclusively for a phone viewport. It has no tablet or desktop
  responsive layouts. Desktop browsers and shells render a 1:1 phone frame, so the owner and the
  agents can inspect the exact phone layout without the browser's device tools or a physical
  device on every check. Sources: issue #118 ("Need",
  <https://github.com/Aristotelesqc/Flourprint/issues/118>); ledger L24 in
  `docs/ux/requirements.md`; issue #120, accepted owner direction 6
  (<https://github.com/Aristotelesqc/Flourprint/issues/120>): "Preserve warm Light/Dark/AMOLED,
  approved artwork and phone-only design. #118 records the intentional desktop phone frame; this
  is not a request for tablet/desktop layouts."
- The frame was introduced for desktop browsers by PR #114 ("owner request of 2026-10-15",
  <https://github.com/Aristotelesqc/Flourprint/pull/114>) and the dev desktop shell by PR #115
  (<https://github.com/Aristotelesqc/Flourprint/pull/115>), both from issue #113 (the shell already
  provided the phone viewport and touch, ADR 0011).
- The wording "Per owner clarification" that the frame is "an intentional design constraint so
  desktop builds stay 1:1 with Android for debugging without responsive tablet/desktop layouts"
  comes from the independent audit comment on #111, section 7
  (<https://github.com/Aristotelesqc/Flourprint/issues/111#issuecomment-6205731046>), which
  also proposed recording it in a short ADR.
- A limit is recorded on the issue itself (its "Coordination" section): recording the phone-frame
  choice "does not imply a fixed 412px layout on every real phone or remove 360/393px and
  larger-text acceptance". L24 says the same: "Layouts must still work on real 360 and 393 px
  phones with larger text", and L25 fixes the required coverage (360 and 393 px, FR and EN,
  larger text 125 to 130 percent, Light/Dark/AMOLED).

### What the code does today (verified on `origin/dev` at `6cf337d`)

Desktop browser, `apps/mobile/src/theme/app.css` (comment and rule at lines 446 to 470):

- A single media query, `@media (pointer: fine) and (min-width: 700px) and (min-height: 600px)`,
  centres `ion-app` at `width: 412px` and `height: min(915px, calc(100vh - 32px))`, with a 28 px
  radius, a shadow and an outline, on a `surface-container-high` background. A `transform` makes
  the frame the containing block of Ionic's fixed overlays, so sheets open inside the phone.
- So the height is 915 px only on windows at least 947 px tall. PR #114 measured the frame at
  412 x 868 in a 1440 x 900 window.
- Phones, touch tablets and windows under 700 x 600 px do not match the query: they get the plain
  full-viewport layout. There is no other breakpoint for tablets or desktops in that file.
- The mouse is not turned into touch in the browser (PR #114).

Desktop shell, `apps/desktop` (`src/settings.ts`, `src/main.ts`, `src/channel.ts`):

- It does not use the CSS frame: the Electron window itself is phone-sized, so the query does not
  match (PR #114 says so). Release and dev shells share this behaviour.
- The window content size is the phone's CSS viewport times a zoom. `DEVICES` offers
  Pixel 9 Pro XL, 448 x 998 (the default, ADR 0011), and Pixel 7, 412 x 915. `ZOOMS` are 100,
  90, 80 and 67 percent, which shrink the window, not the CSS viewport.
- It emulates touch from the mouse, a mobile Android user agent and mobile metrics through the
  DevTools protocol (`emulatePhone`). The dev shell loads a remote address without the SQLite
  bridge (PR #115, ADR 0023); the release shell loads the bundled build.

## Decision

Only what the sources above record:

1. **Phone-only.** The graphical interface is designed exclusively for a phone viewport. No
   tablet or desktop responsive layout is designed, built or required, and the absence of one is
   not a defect (L24, #118, #120 direction 6).
2. **A phone frame on desktop.** Desktop browsers and the Windows desktop shells (release and dev)
   show the app at phone size, 1:1 with the Android geometry, rather than a desktop layout, so
   the phone layout can be inspected without device tools (L24, #118, #113, PR #114, PR #115).
3. **The frame is a viewing aid, not a layout target.** It does not make 412 px the design
   width. Layouts must work on real 360 and 393 px phones with larger text (L24, L25, #118
   "Coordination").
4. **Reviewers and agents** treat the frame and the missing tablet and desktop breakpoints as
   intentional. Audits judge the phone layout; they do not file the frame or the lack of
   responsive layouts as defects (#118 "Need").

The exact frame dimensions, thresholds and device list are implementation details of
`apps/mobile/src/theme/app.css` and `apps/desktop/src/settings.ts`. The record does not make
them owner decisions (see questions 2 and 3).

## Consequences

- Reviewers have one document to cite. A finding that only says "no responsive desktop layout" or
  "fixed 412 x 915 frame" is answered by this ADR.
- Phone acceptance (L25) is unchanged and remains the real constraint, including 360 px at
  125 to 130 percent text.
- Browser checks at desktop sizes show the frame; production-build journeys use a phone
  viewport with touch (PR #114: the Playwright suite uses Pixel 7 with touch, so the frame does not
  apply to it).
- Anyone who later wants a tablet or desktop layout needs a new ADR that supersedes this one.
- No runtime change comes with this ADR. `AGENTS.md` gains one rule that points here.

## Open questions for the owner

The record is silent or inconsistent on these points; this ADR does not choose.

1. **Owner confirmation and date.** Issue #118 has no comment, and its text and the
   "Per owner clarification" line are written by an agent (the issue footer says "Generated by
   Antigravity (Gemini)"). The one dated owner request is PR #114's "owner request of 2026-10-15",
   which asked for the browser frame. Please confirm that points 1 to 4 above state your decision,
   and give its date for the status line.
2. **Which dimensions are the reference?** L24 and #118 say 412 x 915. The code gives: browser
   frame 412 wide and at most 915 tall (868 in a 900 px window); shell default 448 x 998
   (Pixel 9 Pro XL, ADR 0011) with Pixel 7 at 412 x 915 as an option. Is the reference 412 x 915
   everywhere (which would mean changing the shell default, or the wording of L24), the Pixel 9
   Pro XL for the shell, or "412 wide, as tall as the window allows" for the browser?
3. **Tablets and small desktop windows.** The frame applies only with a fine pointer and a
   window of at least 700 x 600 px (chosen in PR #114, not recorded as your decision). A
   touch tablet, a touch laptop or a desktop window under that size gets the unframed layout
   stretched to the viewport. Should the "phone-only" rule also frame those, or is stretching
   acceptable because no tablet layout is promised?
4. **Does the frame reach the shell?** L24 says desktop "shells render a 1:1 phone frame". In
   fact the shell has no CSS frame: its window is the phone. Is a phone-sized window the intended
   meaning (this ADR describes it that way)?
5. **ADR 0011 wording.** ADR 0011 says the window has "the size of a phone (Pixel 9 Pro XL by
   default)". If your answer to question 2 changes the default, ADR 0011 should be amended in the
   same decision. Do you want that done as an amendment line on ADR 0011 or in a later ADR?
6. **DESIGN.md reference.** #118 accepts a reference in `DESIGN.md` or `AGENTS.md`. This pull
   request adds one to `AGENTS.md` only, because `DESIGN.md` is heavily rewritten on
   `ui/0.3-integration` and a second edit would conflict. Do you also want it in `DESIGN.md` once
   that branch lands?
7. **Sources named by #118.** The issue lists ADR 0002, ADR 0016 and ADR 0019 as sources of
   truth. None of the three mentions a phone-only rule (0002 only lists the owner's phone as a
   test target). Should any of them carry a back-reference to this ADR?
