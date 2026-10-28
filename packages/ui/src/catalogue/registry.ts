/** All versions and guides. Release consumers must import a selected manifest instead. */
import { library } from '../index.ts';
import version0 from '../components/button/v1.tsx';
import guide0 from '../components/button/guide.ts';
import version1 from '../components/surface/v1.tsx';
import guide1 from '../components/surface/guide.ts';
import version2 from '../components/number-field/v1.tsx';
import guide2 from '../components/number-field/guide.ts';
import version3 from '../components/disclosure/v1.tsx';
import guide3 from '../components/disclosure/guide.ts';
import version4 from '../components/tabs/v1.tsx';
import guide4 from '../components/tabs/guide.ts';
import version5 from '../components/floating-menu/v1.tsx';
import guide5 from '../components/floating-menu/guide.ts';
import version6 from '../components/bottom-sheet/v1.tsx';
import guide6 from '../components/bottom-sheet/guide.ts';
import version7 from '../components/dialog/v1.tsx';
import guide7 from '../components/dialog/guide.ts';
import version8 from '../components/select/v1.tsx';
import guide8 from '../components/select/guide.ts';
import version9 from '../components/bottom-bar/v1.tsx';
import guide9 from '../components/bottom-bar/guide.ts';

export const catalogue = library.catalogue({
  'fp.button': [version0],
  'fp.surface': [version1],
  'fp.number-field': [version2],
  'fp.disclosure': [version3],
  'fp.tabs': [version4],
  'fp.floating-menu': [version5],
  'fp.bottom-sheet': [version6],
  'fp.dialog': [version7],
  'fp.select': [version8],
  'fp.bottom-bar': [version9],
});

export const guides = library.guides({
  'fp.button': guide0,
  'fp.surface': guide1,
  'fp.number-field': guide2,
  'fp.disclosure': guide3,
  'fp.tabs': guide4,
  'fp.floating-menu': guide5,
  'fp.bottom-sheet': guide6,
  'fp.dialog': guide7,
  'fp.select': guide8,
  'fp.bottom-bar': guide9,
});
