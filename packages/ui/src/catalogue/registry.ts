/**
 * Every version of every Flourprint component, for the catalogue and for comparison overrides
 * (ADR 0020). This module imports all versions, so release builds must not import it: consumers
 * load it only behind a build-time flag (see the package README).
 */
import { library } from '../index.ts';

export const catalogue = library.catalogue({});
