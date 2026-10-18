import type { Guide } from '../../guides.ts';

export default {
  purpose:
    'Feedback while a text or toolbar button is held down: the button shrinks slightly. In round 2 the background changed on hover only.',
  useWhen: ['Filled, tonal, outlined and toolbar buttons, applied to their pressed state.'],
  avoidWhen: ['Icon-only buttons: use fp.motion.press-icon.', 'Anything that is not pressable.'],
  accessibility: [
    'The pressed state must also be visible without motion (background or ripple).',
    'Reduced motion: no transition; the end state applies at once.',
  ],
  related: ['fp.motion.press-icon'],
  decisions: [
    {
      label: "Owner: keep round 2's motion (#134)",
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659',
    },
    {
      label: 'ADR 0021: motion items',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
} satisfies Guide;
