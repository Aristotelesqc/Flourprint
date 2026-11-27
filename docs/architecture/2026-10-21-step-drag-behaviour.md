# Step drag behaviour dependency

Release: 0.3.0. Related: #123, #133, #134, #147; ADR 0021 layer 2.

The owner approved a bounded dnd-kit integration on 2026-10-21 after requesting clearer
detachable Compact rows and a moving full-height insertion space. The lifted step must follow
both pointer axes, remain above accordion headers, and return to its original position after a
refused, outside or cancelled drop. The engine remains the only authority for process changes.

## Demonstrated need and alternatives

- React provides pointer and native drag events, but no complete sortable-list behaviour.
- The installed Ionic 9.0.6 reorder implementation sets its gesture direction to `y` and
  translates the selected item with `translateY`. Its existing behaviour does not provide the
  owner's free X/Y tracking. The ADR 0021 inventory also records its missing keyboard reorder
  support. Keeping it would require another custom behaviour layer for the requested case.
- The #133 implementation at `68faf79` has a custom gesture engine with an origin placeholder
  and insertion line. It does not move neighbours aside to expose a travelling insertion space.
  The owner's phone feedback establishes the usability gap; earlier automated tests do not
  establish satisfactory phone feel.
- Modern dnd-kit provides sortable geometry, optimistic visual reordering, handles, sensors,
  and a drag overlay. Its final application-state update remains caller-controlled. A reusable
  `fp.*` adapter will isolate it from screens and from baking/process semantics.

This is a source/API comparison, not a completed comparative phone trial. The implementation PR
must still prove cancellation, engine refusals, accessible alternatives, local autoscroll,
reduced motion, and draft/Undo/Save behaviour through actual interactions.

## Version and maintenance policy

`@dnd-kit/react` is pinned to **0.5.1**, published 2026-10-15. `@dnd-kit/dom` is also pinned to
**0.5.1** as a direct dependency: its supported `PointerActivationConstraints` API supplies the
movement/hold options and is not re-exported by the React entry point. This declares a package
already present in the React dependency graph; it adds no further resolved package.
The React package's published React and React DOM
peer ranges explicitly include `^19.0.0`; Flourprint uses React 19.3.0. The MIT licence permits
local patches or a fork with the required notices retained. No maintenance guarantee is assumed.

The lockfile freezes the resolved transitive graph, including the modern `@dnd-kit/dom`,
`@dnd-kit/state` and `@dnd-kit/abstract` packages. No legacy `@dnd-kit/core` or separate legacy
`@dnd-kit/sortable` is selected. The dependency is confined to `packages/ui`; adding it does
not itself add imports to the production mobile app.

Upgrades use a short-lived branch from `dev`, an exact candidate version, lockfile review,
affected browser journeys and a phone preview before integration. No permanent extra integration
branch or automatic adoption of upstream prereleases is required. Small necessary fixes may be
carried as explicit versioned patches; a larger maintained fork is a deliberate later decision.

The owner's Compact presentation choice does not settle movement-versus-hold activation,
cross-group policies, downward-chain semantics, or other open O3 decisions. Behaviour previews
must never bypass `moveStep` or create saved revisions before an accepted Save.

## Primary references checked 2026-10-21

- [Ionic reorder group](https://ionicframework.com/docs/api/reorder-group).
- [React common element events](https://react.dev/reference/react-dom/components/common).
- [Modern sortable state management](https://dndkit.com/react/guides/sortable-state-management/).
- [Modern drag overlay](https://dndkit.com/react/components/drag-overlay/).
- [0.5.1 release](https://github.com/clauderic/dnd-kit/releases/tag/%40dnd-kit%2Freact%400.5.1).
- [Published package metadata](https://registry.npmjs.org/@dnd-kit%2Freact/0.5.1).

This dependency slice changes no contract, production screen or persisted data. The #133
mockup and shared-library implementation follows separately; owner visual approval and native
device acceptance remain distinct from dependency compatibility.
