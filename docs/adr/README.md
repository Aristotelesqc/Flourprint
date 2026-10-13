# Architecture Decision Records

An ADR records an architecture choice, its alternatives and its consequences. An accepted ADR is
not rewritten: it is replaced by a new ADR that marks it `Superseded`.

Template: `Status`, `Context`, `Decision`, `Consequences`.

| ADR                                          | Title                                                    | Status                                    |
| -------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| [0001](0001-engine-first-layers.md)          | Engine first, layers and packages                        | Accepted                                  |
| [0002](0002-stack.md)                        | Technology stack                                         | Accepted, versions to complete (#23, #24) |
| [0003](0003-sqlite-json-documents.md)        | Versioned JSON documents in SQLite                       | Accepted                                  |
| [0004](0004-bake-events-only.md)             | Events for bakes only                                    | Accepted                                  |
| [0005](0005-process-dag.md)                  | Minimal process graph                                    | Accepted                                  |
| [0006](0006-numeric-representation.md)       | Numeric representation and fixtures                      | Accepted                                  |
| [0007](0007-history-snapshots.md)            | Revisions reference, bakes copy                          | Accepted                                  |
| [0008](0008-milestones-capability-levels.md) | Alpha / Engine MVP milestones and N1–N3 levels           | Accepted, amended by 0010 and 2026-10-11  |
| [0009](0009-english-and-i18n.md)             | English as project language, localizable UI              | Accepted                                  |
| [0010](0010-fermentation-model-in-alpha.md)  | First fermentation model in Dogfood Alpha                | Accepted                                  |
| [0011](0011-desktop-simulator.md)            | A desktop shell to run the app on a PC                   | Accepted                                  |
| [0012](0012-bake-notifications.md)           | Notifications for running bakes                          | Accepted                                  |
| [0013](0013-web-preview-and-dev-channel.md)  | A web preview link and a remote-loaded dev APK           | Accepted                                  |
| [0014](0014-simulation-mode.md)              | Simulation mode                                          | Accepted                                  |
| [0015](0015-browser-persistence.md)          | Persistent data in the browser preview                   | Accepted                                  |
| [0016](0016-versions-and-releases.md)        | App versions and releases                                | Accepted                                  |
| [0017](0017-design-brief.md)                 | Shared DESIGN.md brief for the interface                 | Accepted; no stack migration              |
| [0018](0018-canary-channel.md)               | Canary branch and web channel for the release after next | Accepted                                  |
