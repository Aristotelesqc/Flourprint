import { describe, expect, it, vi } from 'vitest';
import {
  checkMotions,
  durationMs,
  ionicAnimation,
  parseMotionOverrides,
  parseUiOverrides,
  playMotion,
  transitionCss,
  type IonicAnimationBuilder,
  type KeyframesMotion,
} from '../src/motion.ts';
import { checkGuides } from '../src/guides.ts';
import { parseOverrides } from '../src/library.ts';
import { defaultMotionManifest, motionCatalogue, motionGuides } from '../src/catalogue/motions.ts';
import { testCatalogue } from './fixtures/catalogue.ts';

const sheetEnter = defaultMotionManifest['fp.motion.sheet-enter'] as KeyframesMotion;

/**
 * An element stand-in: `closest` finds the nearest data-motion marker, `animate` records and
 * returns an animation whose `finished` the test resolves, and `getAnimations` lists it.
 */
const element = (motion?: 'reduced' | 'standard') => {
  const animations: Array<Animation & { resolve: () => void }> = [];
  const animate = vi.fn(() => {
    let resolve = () => {};
    const finished = new Promise<Animation>((done) => {
      resolve = () => done(animation);
    });
    const animation = {
      id: '',
      finished,
      commitStyles: vi.fn(),
      cancel: vi.fn(),
      resolve,
    } as unknown as Animation & { resolve: () => void };
    animations.push(animation);
    return animation;
  });
  const marker = motion ? { getAttribute: () => motion } : null;
  return {
    animate,
    animations,
    getAnimations: () => animations,
    closest: () => marker,
  } as unknown as Element & { animate: typeof animate; animations: typeof animations };
};

describe('motion items (ADR 0021)', () => {
  it('keeps round 2 timing through named tokens', () => {
    expect(durationMs('effect')).toBe(150);
    expect(durationMs('spatial')).toBe(220);
    expect(durationMs('sheet')).toBe(260);
  });

  it('plays the standard form with token duration and easing', () => {
    const target = element('standard');
    playMotion(sheetEnter, target);
    expect(target.animate).toHaveBeenCalledWith(
      [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
      expect.objectContaining({ duration: 260, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' }),
    );
  });

  it('commits the end state and removes the animation when it finishes', async () => {
    const target = element('standard');
    const animation = playMotion(sheetEnter, target) as Animation & { resolve: () => void };
    expect(animation.id).toBe('fp.motion:fp.motion.sheet-enter');
    animation.resolve();
    await animation.finished;
    await Promise.resolve();
    expect(animation.commitStyles).toHaveBeenCalled();
    expect(animation.cancel).toHaveBeenCalled();
  });

  it('cancels a motion still playing on the element before playing again', () => {
    const target = element('standard');
    const first = playMotion(sheetEnter, target);
    playMotion(sheetEnter, target);
    expect(first?.cancel).toHaveBeenCalled();
    expect(target.animate).toHaveBeenCalledTimes(2);
  });

  it('follows the system setting when no element is marked', () => {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    })) as typeof matchMedia;
    try {
      expect(playMotion(sheetEnter, element())).toBeUndefined();
    } finally {
      globalThis.matchMedia = original;
    }
  });

  it('plays nothing in reduced motion, whether marked or asked', () => {
    const marked = element('reduced');
    expect(playMotion(sheetEnter, marked)).toBeUndefined();
    expect(marked.animate).not.toHaveBeenCalled();
    const asked = element('standard');
    expect(playMotion(sheetEnter, asked, { reduced: true })).toBeUndefined();
  });

  it('writes CSS transitions from tokens, and none in reduced motion', () => {
    const press = defaultMotionManifest['fp.motion.press'];
    if (press.kind !== 'transition') throw new Error('press is a transition');
    expect(transitionCss(press, false)).toBe(
      'background-color 150ms cubic-bezier(0.2, 0, 0, 1), transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    );
    expect(transitionCss(press, true)).toBe('none');
  });

  it('builds Ionic enter animations without importing Ionic', () => {
    const calls: string[] = [];
    const builder: IonicAnimationBuilder = {
      addElement: (el) => (calls.push(`element:${el ? 'part' : 'none'}`), builder),
      duration: (ms) => (calls.push(`duration:${ms}`), builder),
      easing: (curve) => (calls.push(`easing:${curve}`), builder),
      keyframes: (frames) => (calls.push(`keyframes:${frames.length}`), builder),
    };
    const base = {
      shadowRoot: {
        querySelector: (selector: string) => (selector === '.modal-wrapper' ? {} : null),
      },
      querySelector: () => null,
      closest: () => null,
    } as unknown as HTMLElement;
    ionicAnimation(sheetEnter, () => builder, '.modal-wrapper')(base);
    expect(calls).toEqual([
      'element:part',
      'duration:260',
      'easing:cubic-bezier(0.05, 0.7, 0.1, 1)',
      'keyframes:2',
    ]);
    calls.length = 0;
    const reducedBase = {
      querySelector: () => ({}),
      closest: () => ({ getAttribute: () => 'reduced' }),
    } as unknown as HTMLElement;
    ionicAnimation(sheetEnter, () => builder, '.modal-wrapper')(reducedBase);
    expect(calls).toEqual(['element:part', 'duration:0', 'keyframes:2']);
  });

  it('reads components and motions from one ui parameter and rejects what neither knows', () => {
    const query = '?ui=fp.badge:v2,fp.motion.sheet-enter:v1,fp.motion.press:v9,fp.nope:v1';
    const both = parseUiOverrides(query, { components: testCatalogue, motions: motionCatalogue });
    expect(Object.keys(both.components)).toEqual(['fp.badge']);
    expect(both.motions).toEqual({ 'fp.motion.sheet-enter': sheetEnter });
    expect(both.rejected).toEqual(['fp.nope:v1', 'fp.motion.press:v9']);
    expect(parseMotionOverrides(query, motionCatalogue).rejected).toEqual(['fp.motion.press:v9']);
  });

  it('keeps parseOverrides rejecting every entry it does not know, motions included', () => {
    const { rejected } = parseOverrides('?ui=fp.badge:v2,fp.motion.sheet-entr:v1', testCatalogue);
    expect(rejected).toEqual(['fp.motion.sheet-entr:v1']);
  });

  it('has a consistent catalogue, default manifest and complete guides', () => {
    expect(checkMotions(motionCatalogue, defaultMotionManifest)).toEqual([]);
    expect(checkGuides(motionGuides, Object.keys(motionCatalogue))).toEqual([]);
    for (const versions of Object.values(motionCatalogue)) {
      for (const motion of versions) expect(motion.reduced).toBeDefined();
    }
  });
});

describe('guides', () => {
  it('reports missing, extra and blank guides and non-https links', () => {
    const guide = motionGuides['fp.motion.press'];
    expect(
      checkGuides(
        {
          'fp.a': { ...guide, purpose: ' ', decisions: [{ label: 'x', url: 'http://x' }] },
          'fp.extra': guide,
        },
        ['fp.a', 'fp.b'],
      ),
    ).toEqual([
      { id: 'fp.b', problem: 'no guide' },
      { id: 'fp.a', problem: 'blank purpose' },
      { id: 'fp.a', problem: 'decision link is not https: http://x' },
      { id: 'fp.extra', problem: 'guide for an id with no versions' },
    ]);
  });
});
