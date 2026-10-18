// A small motion set for testing the mechanism without Flourprint's own motions.
import { createMotionLibrary } from '../../src/motion.ts';

export type TestMotion = 'fp.motion.fade';
export const testMotionLibrary = createMotionLibrary<TestMotion>();
