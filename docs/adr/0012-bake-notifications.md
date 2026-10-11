# ADR 0012: Notifications for running bakes

Status: Accepted (owner request of 2026-10-10).

## Context

The owner runs several bakes at once and leaves the phone between steps (a 12 h preferment, a
1 h proof). The app only tells them what to do while it is open. A reminder must reach them when
the app is in the background or closed, at the planned time of each step.

## Decision

- The app schedules **local notifications** from the live projection of every active bake: the
  planned end of each running step and the planned start of each step that can start
  (`bakeAlerts`). A step waiting on a running one has no reminder of its own: the end of the
  running step calls the baker.
- On Android: `@capacitor/local-notifications` (the Capacitor team's plugin; the platform's alarm
  manager is the only way to be woken while the app is closed). New dependency, justified by that
  need. It declares `POST_NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM`; the app asks for the first
  and offers the system setting for the second (without it, Android may deliver late).
- In the PC shell and a browser: the web `Notification` API with timers, while the app runs.
- Reminders are **derived, never stored**: after every change to a bake, at start-up and when
  the app comes back to the foreground, all pending reminders are replaced by those of the current
  projections. Nothing is written to the bake log. A reminder opens its bake when tapped.
- Texts come from the message catalog (ADR 0009).

## Consequences

- A plan changed on another device, or a projection that moves while the app stays closed (an
  open-ended step), keeps the reminders of the last time the app ran.
- The notification permission can be refused; bake mode keeps working without it.
