// Compile-time guarantees of ADR 0020, checked by `tsc -p packages/ui`: every line under
// `@ts-expect-error` must keep failing to type-check. Nothing here runs.
import type { ButtonHTMLAttributes } from 'react';
import type { ComponentGuide } from '../src/guides.ts';
import { createUi } from '../src/library.ts';
import badgeV1 from './fixtures/badge/v1.ts';
import cardV1 from './fixtures/card-v1.ts';
import { testLibrary } from './fixtures/components.ts';
import { testManifest } from './fixtures/manifest.ts';
import fadeV1 from './fixtures/fade/v1.ts';
import { testMotionLibrary } from './fixtures/motions.ts';

const { Ui } = createUi(testManifest);

export const accepted = () => (
  <>
    <Ui component="fp.badge" label="Partial" tone="warning" />
    <Ui component="fp.card" title="Shokupan" />
  </>
);

export const refused = () => {
  // @ts-expect-error A manifest needs an entry for every id.
  testLibrary.manifest({ 'fp.badge': badgeV1 });
  // @ts-expect-error A manifest entry must be a version of that id.
  testLibrary.manifest({ 'fp.badge': cardV1, 'fp.card': cardV1 });
  testLibrary.version({
    id: 'fp.card',
    version: 'v2',
    component: () => null,
    notes: '',
    // @ts-expect-error Examples use the id's props.
    examples: [{ name: 'Wrong', props: { label: 'x' } }],
  });
  // @ts-expect-error A version name is v<number>.
  testLibrary.version({ ...cardV1, version: 'beta' });
  // @ts-expect-error A motion item needs its reduced-motion form.
  testMotionLibrary.motion({
    id: 'fp.motion.fade',
    version: 'v3',
    notes: '',
    kind: 'keyframes',
    standard: { keyframes: [], duration: 'effect', easing: 'standard' },
  });
  // @ts-expect-error Motion timing uses token names, not raw values.
  testMotionLibrary.motion({ ...fadeV1, standard: { ...fadeV1.standard, duration: '150ms' } });
  // @ts-expect-error A motion manifest needs an entry for every motion id.
  testMotionLibrary.manifest({});
  // @ts-expect-error Every motion id needs a guide.
  testMotionLibrary.guides({});
  const guide = { purpose: 'x', useWhen: ['x'], avoidWhen: [], accessibility: ['x'] } as const;
  const base = { ...guide, related: [], decisions: [] };
  // A button that spreads native attributes documents its own props and children only.
  type ButtonLike = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' };
  const button: ComponentGuide<ButtonLike> = { ...base, props: { variant: 'x', children: 'x' } };
  // @ts-expect-error Its own optional props still need a description.
  const partial: ComponentGuide<ButtonLike> = { ...base, props: { children: 'x' } };
  const pill: ComponentGuide<{ value: string; label?: string }> = {
    ...base,
    // @ts-expect-error A prop named like an attribute is documented when nothing is spread.
    props: { label: 'x' },
  };
  void [button, partial, pill];
  return (
    <>
      {/* @ts-expect-error Props are checked against the id's props type. */}
      <Ui component="fp.badge" title="x" />
      {/* @ts-expect-error Required props of the id are required. */}
      <Ui component="fp.card" />
      {/* @ts-expect-error Unknown ids do not exist. */}
      <Ui component="fp.nope" label="x" />
    </>
  );
};
