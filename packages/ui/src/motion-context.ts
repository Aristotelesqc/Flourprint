/**
 * Components reach their motions through context (ADR 0021): the consumer provides its motion
 * manifest once, and a component asks for `useMotion('fp.motion.sheet-enter')`. Swapping a
 * motion version is a manifest change; components are not touched.
 */
import { createContext, useContext } from 'react';
import type { Motion, MotionManifest } from './motion.ts';
import type { FlourprintMotion } from './motions.ts';

const MotionContext = createContext<MotionManifest<FlourprintMotion> | null>(null);

/** Wrap the app (or the catalogue) once: `<MotionProvider value={motionManifest}>`. */
export const MotionProvider = MotionContext.Provider;

export const useMotion = <I extends FlourprintMotion>(id: I): Motion<I> => {
  const manifest = useContext(MotionContext);
  if (!manifest) throw new Error(`useMotion(${id}) needs a <MotionProvider> above it`);
  return manifest[id] as Motion<I>;
};
