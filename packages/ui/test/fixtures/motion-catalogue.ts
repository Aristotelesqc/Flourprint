// Every motion version, loaded only behind the comparison flag.
import fadeV1 from './fade/v1.ts';
import fadeV2 from './fade/v2.ts';
import { testMotionLibrary } from './motions.ts';

export const testMotionCatalogue = testMotionLibrary.catalogue({
  'fp.motion.fade': [fadeV1, fadeV2],
});
