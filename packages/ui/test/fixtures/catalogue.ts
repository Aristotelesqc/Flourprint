// Every version: what a catalogue registry looks like.
import badgeV1 from './badge/v1.ts';
import badgeV2 from './badge/v2.ts';
import cardV1 from './card-v1.ts';
import { testLibrary } from './components.ts';

export const testCatalogue = testLibrary.catalogue({
  'fp.badge': [badgeV1, badgeV2],
  'fp.card': [cardV1],
});
