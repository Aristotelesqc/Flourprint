import type { ComponentGuide } from '../../guides.ts';
import type { ButtonProps } from '../../props.ts';

export default {
  purpose:
    "A text button, optionally with a leading pictogram. Primary for the screen's main action, secondary by default.",
  useWhen: [
    'Actions named by a verb in the infinitive (French UI).',
    'Main screen action (primary) or secondary/supporting actions (secondary, quiet, danger).',
  ],
  avoidWhen: [
    'Icon-only actions: use fp.icon-button.',
    'More than one primary button in the same view.',
  ],
  accessibility: [
    'Native button attributes (type, disabled, onClick, className, aria attributes and style) are forwarded; selected motion timing is retained over style overrides.',
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'Touch target is an independent 48 px minimum height box (--fp-spacing-touch); the visible material shape is 40 px (--fp-spacing-touch-compact) inset 4 px vertically using a decorative span (ADR 0021, #142). Zero vertical rem padding prevents target blowout under larger text.',
    'type defaults to "button", so it never submits forms by accident.',
    'Disabled buttons receive disabled attribute, opacity 0.45, and pointer-events none; explain the reason nearby when not obvious.',
    'The native button receives the shared :focus-visible outline.',
    'The consumer must check label fit and non-overlapping hit boxes at 393 px / 100% and 360 px / 130%. Labels must not wrap mid-word.',
  ],
  related: ['fp.icon-button', 'fp.motion.press'],
  decisions: [
    {
      label: 'Owner: round 2 is the visual baseline proposal (#134; not yet shipped on main)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
    {
      label: 'ADR 0020: versioned component library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
    {
      label: 'ADR 0021: motion tokens and 48px hit target separation',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
  props: {
    variant:
      "'primary', 'secondary' (default), 'quiet', or 'danger' (separated destructive actions or confirmations).",
    icon: 'Optional leading pictogram (IconName).',
    children: 'The label text from a message key.',
    dataTestId: 'Test id for browser suites.',
  },
} satisfies ComponentGuide<ButtonProps>;
