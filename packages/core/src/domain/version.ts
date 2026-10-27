/** Version of the data contracts described in docs/contracts/. */
export const CONTRACT_VERSION = '0.21.0';

/**
 * Version of the calculation engine recorded in bake snapshots (D8). 0.8.0: the dough thermal
 * model (sub-model `flourprint.dough-thermal` 0.1.0, #176) and the per-instant envelope of the
 * lag band, which replaces the two shared corners of 0.7.0 (fermentation.md, The band and the
 * envelope). Central values of a process without thermal inputs are unchanged.
 */
export const ENGINE_VERSION = '0.8.0';
