/**
 * Test-only consumer of the overlay motion bridge (ADR 0021): a real anchored `IonPopover` and a
 * real `IonModal` with breakpoints, whose native animations take their timing from the selected
 * motion items. `?version=alt` selects test versions with other duration tokens, as a manifest
 * change would; `?motion=reduced` asks for reduced motion. Never in a release build.
 */
import { useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { IonApp, IonContent, IonModal, IonPopover, setupIonicReact } from '@ionic/react';
import '../../../catalogue.css';
import {
  defaultMotionManifest,
  motionLibrary,
  MotionProvider,
  useMotion,
  useOverlayMotion,
} from '../../../src/index.ts';

setupIonicReact({ mode: 'md' });

const query = new URLSearchParams(location.search);
const motion = query.get('motion') ?? 'standard';
document.documentElement.setAttribute('data-theme', query.get('theme') ?? 'light');
document.documentElement.setAttribute('data-motion', motion);
document.documentElement.style.fontSize = query.get('scale') === '130' ? '130%' : '100%';

// Test versions that differ from v1 only by their duration token: the comparison a manifest
// switch makes. Same keyframes, same reduced form.
const alt = {
  ...defaultMotionManifest,
  'fp.motion.menu-enter': motionLibrary.motion({
    ...defaultMotionManifest['fp.motion.menu-enter'],
    version: 'v2',
    notes: 'Test only: spatial duration.',
    standard: { ...defaultMotionManifest['fp.motion.menu-enter'].standard, duration: 'spatial' },
  } as (typeof defaultMotionManifest)['fp.motion.menu-enter']),
  'fp.motion.menu-exit': motionLibrary.motion({
    ...defaultMotionManifest['fp.motion.menu-exit'],
    version: 'v2',
    notes: 'Test only: spatial duration.',
    standard: { ...defaultMotionManifest['fp.motion.menu-exit'].standard, duration: 'spatial' },
  } as (typeof defaultMotionManifest)['fp.motion.menu-exit']),
  'fp.motion.sheet-enter': motionLibrary.motion({
    ...defaultMotionManifest['fp.motion.sheet-enter'],
    version: 'v2',
    notes: 'Test only: effect duration.',
    standard: { ...defaultMotionManifest['fp.motion.sheet-enter'].standard, duration: 'effect' },
  } as (typeof defaultMotionManifest)['fp.motion.sheet-enter']),
  'fp.motion.sheet-exit': motionLibrary.motion({
    ...defaultMotionManifest['fp.motion.sheet-exit'],
    version: 'v2',
    notes: 'Test only: effect duration.',
    standard: { ...defaultMotionManifest['fp.motion.sheet-exit'].standard, duration: 'effect' },
  } as (typeof defaultMotionManifest)['fp.motion.sheet-exit']),
};
const manifest = query.get('version') === 'alt' ? alt : defaultMotionManifest;
// `?keepAnimated=1`: leave Ionic's `animated` on in reduced motion, so only the bridge can stop it.
const keepAnimated = query.get('keepAnimated') === '1';
// `?open=sheet`: the sheet is mounted already open, its first `willPresent` during mounting.
const openAtMount = query.get('open') === 'sheet';

function Fixture(): ReactElement {
  const reduced = motion === 'reduced' && !keepAnimated;
  const popover = useRef<HTMLIonPopoverElement | null>(null);
  const sheet = useRef<HTMLIonModalElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(openAtMount);
  const menuEnter = useMotion('fp.motion.menu-enter');
  const menuExit = useMotion('fp.motion.menu-exit');
  const sheetEnter = useMotion('fp.motion.sheet-enter');
  const sheetExit = useMotion('fp.motion.sheet-exit');
  const backdropEnter = useMotion('fp.motion.backdrop-enter');
  const backdropExit = useMotion('fp.motion.backdrop-exit');
  useOverlayMotion(popover, { enter: [{ motion: menuEnter }], leave: [{ motion: menuExit }] });
  useOverlayMotion(sheet, {
    enter: [{ part: 'ion-backdrop', motion: backdropEnter }, { motion: sheetEnter }],
    leave: [{ part: 'ion-backdrop', motion: backdropExit }, { motion: sheetExit }],
  });
  return (
    <IonApp>
      <IonContent>
        <main className="p-4 bg-background text-on-surface min-h-screen">
          <h1>Overlay motion bridge fixture</h1>
          <button id="menu-opener" type="button" className="mt-[40vh]">
            Open bridged menu
          </button>
          <IonPopover
            ref={popover}
            trigger="menu-opener"
            animated={!reduced}
            aria-label="Bridged menu"
          >
            <div role="menu" aria-label="Bridged menu" className="p-2">
              <button role="menuitem" type="button">
                First action
              </button>
            </div>
          </IonPopover>
          <button type="button" onClick={() => setSheetOpen(true)}>
            Open bridged sheet
          </button>
          <IonModal
            ref={sheet}
            isOpen={sheetOpen}
            onDidDismiss={() => setSheetOpen(false)}
            breakpoints={[0, 1]}
            initialBreakpoint={1}
            handle
            animated={!reduced}
            aria-label="Bridged sheet"
          >
            <div className="p-4">
              <h2>Bridged sheet</h2>
              <button type="button" onClick={() => setSheetOpen(false)}>
                Close bridged sheet
              </button>
            </div>
          </IonModal>
        </main>
      </IonContent>
    </IonApp>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <MotionProvider value={manifest}>
    <Fixture />
  </MotionProvider>,
);
