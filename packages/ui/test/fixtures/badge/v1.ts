import { createElement } from 'react';
import { testLibrary } from '../components.ts';

export default testLibrary.version({
  id: 'fp.badge',
  version: 'v1',
  component: ({ label }) => createElement('span', { 'data-version': 'BADGE_V1_MARKER' }, label),
  notes: 'First badge.',
  examples: [{ name: 'Neutral', props: { label: 'Neutral' } }],
});
