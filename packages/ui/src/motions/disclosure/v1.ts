import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.disclosure',
  version: 'v1',
  notes: 'Round 2 (`22db386`) accordion groups: height opens through grid-template-rows 0fr → 1fr.',
  kind: 'transition',
  standard: { properties: ['grid-template-rows'], duration: 'spatial', easing: 'standard' },
  reduced: 'none',
  demo: { from: { 'grid-template-rows': '0fr' }, to: { 'grid-template-rows': '1fr' } },
});
