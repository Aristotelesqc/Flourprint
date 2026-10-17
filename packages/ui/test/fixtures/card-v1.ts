import { createElement } from 'react';
import { testLibrary } from './components.ts';

export default testLibrary.version({
  id: 'fp.card',
  version: 'v1',
  component: ({ title }) => createElement('section', { 'data-version': 'CARD_V1_MARKER' }, title),
  notes: 'First card.',
  examples: [{ name: 'Title', props: { title: 'Shokupan' } }],
});
