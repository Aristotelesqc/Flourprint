import { describe, expect, it, vi } from 'vitest';
import {
  checkMotions,
  durationMs,
  ionicAnimation,
  parseMotionOverrides,
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

/** An element stand-in: `closest` finds the nearest data-motion marker, `animate` records. */
const element = (motion?: 'reduced' | 'standard') => {
  const animate = vi.fn(() => ({}) as Animation);
  const marker = motion ? { getAttribute: () => motion } : null;
  return { animate, closest: () => marker } as unknown as Element & { animate: typeof animate };
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
      querySelector: () => ({}),
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
    expect(calls).toEqual(['element:part', 'duration:0']);
  });

  it('shares the ui parameter with components without rejecting each other', () => {
    const query = '?ui=fp.badge:v2,fp.motion.sheet-enter:v1,fp.motion.press:v9';
    const motions = parseMotionOverrides(query, motionCatalogue);
    expect(motions.overrides).toEqual({ 'fp.motion.sheet-enter': sheetEnter });
    expect(motions.rejected).toEqual(['fp.motion.press:v9']);
    expect(parseOverrides(query, testCatalogue).rejected).toEqual([]);
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
