import { createElement } from 'react';
import { testLibrary } from '../components.ts';

export default testLibrary.version({
  id: 'fp.badge',
  version: 'v2',
  component: ({ label, tone = 'neutral' }) =>
    createElement('strong', { 'data-version': 'BADGE_V2_MARKER', 'data-tone': tone }, label),
  notes: 'Adds the warning tone.',
  examples: [
    { name: 'Neutral', props: { label: 'Neutral' } },
    { name: 'Warning', props: { label: 'Partial', tone: 'warning' } },
  ],
});
