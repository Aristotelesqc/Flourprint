import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.chevron',
  version: 'v1',
  notes: 'Round 2 (`22db386`) disclosure chevron: turns 180° as its group opens.',
  kind: 'transition',
  standard: { properties: ['transform'], duration: 'spatial', easing: 'standard' },
  reduced: 'none',
  demo: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(180deg)' } },
});
