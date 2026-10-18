// A consumer motion manifest: imports only the selected version.
import fade from './fade/v1.ts';
import { testMotionLibrary } from './motions.ts';

export const testMotionManifest = testMotionLibrary.manifest({ 'fp.motion.fade': fade });
