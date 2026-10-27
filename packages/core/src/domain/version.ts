/** Version of the data contracts described in docs/contracts/. */
export const CONTRACT_VERSION = '0.22.0';

/**
 * Version of the calculation engine recorded in bake snapshots (D8). 0.8.0: the dough thermal
 * model (#176) and the per-instant envelope of the lag band, which replaces the two shared
 * corners of 0.7.0 (fermentation.md, The band and the envelope). 0.9.0: the personal factor of a
 * calibration set no longer depends on the factors stored before it (sub-model
 * `flourprint.dough-thermal` 0.2.0). Central values of a process without thermal inputs are
 * unchanged.
 */
export const ENGINE_VERSION = '0.9.0';
