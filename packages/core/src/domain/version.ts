/**
 * Version of the data contracts described in docs/contracts/. 0.24.2: the hydration sheet read
 * model (formula.md, Hydration sheet read model, L147), an addition with no persisted shape or
 * calculation change. 0.24.1: a move down a chain is the same chain move as a move up
 * (process.md, Move).
 */
export const CONTRACT_VERSION = '0.24.2';

/**
 * Version of the calculation engine recorded in bake snapshots (D8). 0.8.0: the dough thermal
 * model (#176) and the per-instant envelope of the lag band, which replaces the two shared
 * corners of 0.7.0 (fermentation.md, The band and the envelope). 0.9.0: the personal factor of a
 * calibration set no longer depends on the factors stored before it (sub-model
 * `flourprint.dough-thermal` 0.2.0). 0.9.1: the Guggenheim triple is the widest valid one (0.2.1). Central values of a process without thermal inputs are
 * unchanged. 0.10.0: the dough clock starts at the end of the first-contact step, so the kneading,
 * fermentolyse and other steps between it and the end of the last mixing step count, and a
 * preferment's clock starts at the end of its own mixing step (fermentation.md, process.md, owner
 * decisions of 2026-11-04); the kinetic model `flourprint.commercial-yeast` stays 0.1.0.
 */
export const ENGINE_VERSION = '0.10.0';
