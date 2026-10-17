// A consumer manifest: switching the badge is changing `v1` to `v2` on the first import line.
import badge from './badge/v1.ts';
import card from './card-v1.ts';
import { testLibrary } from './components.ts';

export const testManifest = testLibrary.manifest({ 'fp.badge': badge, 'fp.card': card });
