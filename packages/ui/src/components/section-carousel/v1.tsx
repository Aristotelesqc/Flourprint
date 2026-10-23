import './v1.css';
import React, { useRef, useEffect, useState } from 'react';
import type { SectionCarouselProps, TabGestureProgress } from '../../props.ts';
import { library } from '../../index.ts';
import { playTabCarouselSlide, useTabCarouselMotion } from '../../motions/tab-carousel';

const VELOCITY_WINDOW_MS = 120;
const MAX_HOLD_BEFORE_RELEASE_MS = 120;
const getEventTime = (event: { timeStamp: number }): number =>
  event.timeStamp > 0 ? event.timeStamp : performance.now();

export const SectionCarousel: React.FC<SectionCarouselProps> = ({
  sections,
  activeSection: controlledSection,
  defaultSection,
  onChangeSection,
  label,
  reduced = false,
  onGestureProgress,
  targetTabsElement,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledSection !== undefined;
  const [uncontrolledSection, setUncontrolledSection] = useState<string>(
    () => defaultSection ?? sections[0] ?? '',
  );
  const activeSection = isControlled ? controlledSection : uncontrolledSection;
  const activeIndex = Math.max(0, sections.indexOf(activeSection));

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Phase separation: 'idle' | 'tracking' | 'settling'
  const phaseRef = useRef<'idle' | 'tracking' | 'settling'>('idle');
  const settleAnimationRef = useRef<Animation | null>(null);
  const cancelSettleRef = useRef<(() => void) | null>(null);
  const [committedIndex, setCommittedIndex] = useState<number>(activeIndex);
  const committedIndexRef = useRef<number>(activeIndex);
  committedIndexRef.current = committedIndex;
  const currentTransformRef = useRef<string | null>(null);

  // Consume motion from MotionProvider
  const motion = useTabCarouselMotion();

  // Track visible panes to ensure inactive panes are inert & hidden when stationary
  const [revealedPanes, setRevealedPanes] = useState<number[]>([activeIndex]);

  const selectSection = (nextIndex: number) => {
    const nextSection = sections[nextIndex];
    if (nextSection === undefined) return;
    if (!isControlled) {
      setUncontrolledSection(nextSection);
    }
    onChangeSection?.(nextSection);
  };

  const gestureRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    velocityX: number;
    samples: Array<{ x: number; t: number }>;
    pointerId: number | null;
    isLockedHorizontal: boolean;
    isCancelled: boolean;
    isDragging: boolean;
    currentDx: number;
    adjacentIndex: number | null;
    startIndex: number;
  }>({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    samples: [],
    pointerId: null,
    isLockedHorizontal: false,
    isCancelled: false,
    isDragging: false,
    currentDx: 0,
    adjacentIndex: null,
    startIndex: 0,
  });

  const dispatchTabSignal = (fromId: string, toId?: string, progress: number = 0) => {
    const detail: TabGestureProgress | null = toId ? { fromId, toId, progress } : null;
    if (onGestureProgress) {
      onGestureProgress(detail);
    }
    const container = containerRef.current;
    const landmark = container
      ? (container.closest(
          '[data-fp-overlay-boundary], [data-navigation], [data-tabs-scope], [data-fp-container], [role="application"], body',
        ) ?? container.parentElement?.parentElement)
      : null;
    const tabs =
      targetTabsElement ??
      landmark?.querySelector<HTMLElement>(
        '[data-fp-component="fp.tabs"], .section-tabs, [role="tablist"]',
      ) ??
      null;

    if (tabs) {
      tabs.dispatchEvent(
        new CustomEvent('fp:tab-gesture', {
          bubbles: true,
          detail,
        }),
      );
    }
  };

  // Slide track when activeSection changes externally (e.g. tab tap or external prop change)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // If activeIndex matches what is already committed, avoid duplicate animation
    if (activeIndex === committedIndexRef.current && phaseRef.current === 'idle') {
      setRevealedPanes([activeIndex]);
      return;
    }

    if (gestureRef.current.isDragging) return;

    // Cancel any active animation or previous settle
    let isTransitionCleanedUp = false;
    cancelSettleRef.current?.();
    settleAnimationRef.current?.cancel();
    cancelSettleRef.current = () => {
      isTransitionCleanedUp = true;
    };

    const fromIndex = committedIndexRef.current;
    const targetPercent = -activeIndex * 100;
    if (containerRef.current && containerRef.current.scrollLeft !== 0) {
      containerRef.current.scrollLeft = 0;
    }

    if (reduced) {
      phaseRef.current = 'idle';
      track.style.transform = `translateX(${targetPercent}%)`;
      currentTransformRef.current = `translateX(${targetPercent}%)`;
      committedIndexRef.current = activeIndex;
      setCommittedIndex(activeIndex);
      setRevealedPanes([activeIndex]);
      dispatchTabSignal(sections[activeIndex] ?? activeSection, undefined, 0);
      return;
    }

    phaseRef.current = 'settling';

    // Capture actual computed matrix when interrupting, or track inline style, or starting percent
    let currentTransform = track.style.transform;
    try {
      const computed = window.getComputedStyle(track).transform;
      if (computed && computed !== 'none') {
        currentTransform = computed;
      }
    } catch {
      // ignore
    }
    if (!currentTransform) {
      currentTransform = `translateX(${-fromIndex * 100}%)`;
    }

    const container = containerRef.current;
    const containerWidth = container?.clientWidth || 393;
    const distancePx = (fromIndex - activeIndex) * containerWidth;

    setRevealedPanes((prev) => Array.from(new Set([...prev, fromIndex, activeIndex])));

    const anim = playTabCarouselSlide(track, currentTransform, `${targetPercent}%`, {
      ...(motion ? { motion } : {}),
      durationMs: 220,
      distancePx,
      reduced: false,
      onProgress: (p: number) => {
        if (isTransitionCleanedUp || phaseRef.current !== 'settling') return;
        dispatchTabSignal(sections[fromIndex] ?? activeSection, sections[activeIndex], p);
      },
      onFinish: () => {
        if (isTransitionCleanedUp || phaseRef.current !== 'settling') return;
        phaseRef.current = 'idle';
        track.style.transform = `translateX(${targetPercent}%)`;
        currentTransformRef.current = `translateX(${targetPercent}%)`;
        committedIndexRef.current = activeIndex;
        setCommittedIndex(activeIndex);
        setRevealedPanes([activeIndex]);
        dispatchTabSignal(sections[activeIndex] ?? activeSection, undefined, 0);
        if (containerRef.current && containerRef.current.scrollLeft !== 0) {
          containerRef.current.scrollLeft = 0;
        }
      },
    });

    settleAnimationRef.current = anim ?? null;
  }, [activeIndex, reduced, motion]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelSettleRef.current?.();
      settleAnimationRef.current?.cancel();
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const relX = event.clientX - rect.left;

    // L101: No swipe starts near the screen edges (24px Android Back gesture margin)
    if (relX < 24 || relX > rect.width - 24) return;

    const target = event.target as Element | null;
    if (!target) return;

    // L101: Check drag handles, input fields, and computed overflow-x ancestors
    let el: Element | null = target;
    while (el && el !== container) {
      if (
        el.matches(
          '.fp-drag-handle, .is-dragging, .step-handle, .drag-handle, [data-drag-handle], [draggable="true"]',
        )
      ) {
        return;
      }
      if (
        el.matches(
          'input, textarea, select, [contenteditable="true"], .toolbar-search, [data-horizontal-scroll]',
        )
      ) {
        return;
      }
      const style = window.getComputedStyle(el);
      if (
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth
      ) {
        return;
      }
      el = el.parentElement;
    }

    // A new gesture cleanly cancels active settle without stale callbacks
    if (phaseRef.current === 'settling') {
      settleAnimationRef.current?.cancel();
      cancelSettleRef.current?.();
      phaseRef.current = 'idle';
      if (trackRef.current) {
        try {
          const comp = window.getComputedStyle(trackRef.current).transform;
          if (comp && comp !== 'none') {
            currentTransformRef.current = comp;
          }
        } catch {
          // ignore
        }
      }
    }

    const now = getEventTime(event);
    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      velocityX: 0,
      samples: [{ x: event.clientX, t: now }],
      pointerId: event.pointerId,
      isLockedHorizontal: false,
      isCancelled: false,
      isDragging: false,
      currentDx: 0,
      adjacentIndex: null,
      startIndex: activeIndexRef.current,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== event.pointerId || g.isCancelled) return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    const now = getEventTime(event);

    // L101: A swipe starts only on a clearly horizontal gesture; vertical scrolling wins otherwise
    if (!g.isLockedHorizontal) {
      const distance = Math.hypot(dx, dy);
      if (distance < 8) {
        g.samples.push({ x: event.clientX, t: now });
        g.lastX = event.clientX;
        g.lastTime = now;
        return; // gesture slop
      }

      if (Math.abs(dy) > Math.abs(dx)) {
        g.isCancelled = true;
        return;
      }

      g.isLockedHorizontal = true;
      g.isDragging = true;
      phaseRef.current = 'tracking';
      try {
        containerRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // pointer capture fallback
      }
    }

    g.samples.push({ x: event.clientX, t: now });
    const cutoff = now - VELOCITY_WINDOW_MS;
    while (g.samples.length > 2 && (g.samples[0]?.t ?? now) < cutoff) {
      g.samples.shift();
    }
    const firstSample = g.samples.find((s) => s.t >= cutoff) ?? { x: event.clientX, t: now };
    const windowDt = now - firstSample.t;
    if (windowDt > 0) {
      g.velocityX = (event.clientX - firstSample.x) / windowDt;
    }
    g.lastX = event.clientX;
    g.lastTime = now;
    g.currentDx = dx;

    const container = containerRef.current;
    const containerWidth = container?.clientWidth || 393;
    const startIndex = g.startIndex;

    // Identify adjacent pane and reveal starting + adjacent pane during swipe
    let adj = startIndex;
    if (dx < 0 && startIndex < sections.length - 1) {
      adj = startIndex + 1;
    } else if (dx > 0 && startIndex > 0) {
      adj = startIndex - 1;
    }
    g.adjacentIndex = adj;
    if (adj !== startIndex) {
      setRevealedPanes((prev) => {
        if (prev.length === 2 && prev.includes(startIndex) && prev.includes(adj)) {
          return prev;
        }
        return [startIndex, adj];
      });
    }

    // Send progress signal to Tabs so indicator follows finger
    const progress = Math.min(1, Math.abs(dx) / containerWidth);
    const toId = adj !== startIndex ? sections[adj] : undefined;
    dispatchTabSignal(sections[startIndex] ?? activeSection, toId, progress);

    // L101: In reduced motion, no direct follow animation
    if (reduced) return;

    const track = trackRef.current;
    if (track) {
      let effectiveDx = dx;
      if (startIndex === 0 && dx > 0) {
        effectiveDx = dx * 0.25;
      } else if (startIndex === sections.length - 1 && dx < 0) {
        effectiveDx = dx * 0.25;
      }

      const basePercent = -startIndex * 100;
      const transformValue = `translateX(calc(${basePercent}% + ${effectiveDx}px))`;
      currentTransformRef.current = transformValue;
      track.style.transform = transformValue;
    }
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== event.pointerId) return;

    const track = trackRef.current;
    const container = containerRef.current;
    const wasDragging = g.isDragging;
    const startIndex = g.startIndex;

    if (container && container.hasPointerCapture(event.pointerId)) {
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }

    g.pointerId = null;
    g.isDragging = false;
    g.isLockedHorizontal = false;
    g.isCancelled = false;

    if (!wasDragging || !track || !container) {
      phaseRef.current = 'idle';
      dispatchTabSignal(sections[activeIndexRef.current] ?? activeSection, undefined, 0);
      setRevealedPanes([activeIndexRef.current]);
      return;
    }

    const dx = g.currentDx;
    const releasePauseMs = getEventTime(event) - g.lastTime;
    const velocity = releasePauseMs > MAX_HOLD_BEFORE_RELEASE_MS ? 0 : g.velocityX;
    const containerWidth = container.clientWidth || 393;
    const dragThreshold = containerWidth / 2;
    const flickVelocityThreshold = 0.3;

    let targetIndex = startIndex;

    const draggedNext = dx < -dragThreshold;
    const draggedPrev = dx > dragThreshold;
    const flickedNext = dx < -20 && velocity < -flickVelocityThreshold;
    const flickedPrev = dx > 20 && velocity > flickVelocityThreshold;

    if ((draggedNext || flickedNext) && startIndex < sections.length - 1) {
      targetIndex = startIndex + 1;
    } else if ((draggedPrev || flickedPrev) && startIndex > 0) {
      targetIndex = startIndex - 1;
    }

    const targetPercent = -targetIndex * 100;

    // L101: In reduced motion, instant commit without sliding animation
    if (reduced) {
      phaseRef.current = 'idle';
      track.style.transform = `translateX(${targetPercent}%)`;
      currentTransformRef.current = `translateX(${targetPercent}%)`;
      committedIndexRef.current = targetIndex;
      setCommittedIndex(targetIndex);
      setRevealedPanes([targetIndex]);
      dispatchTabSignal(sections[targetIndex] ?? activeSection, undefined, 0);
      if (targetIndex !== activeIndexRef.current) {
        selectSection(targetIndex);
      }
      return;
    }

    // SETTLING PHASE: separate tracking, settling and semantic selection (L106/L117)
    phaseRef.current = 'settling';

    let effectiveDx = dx;
    if (startIndex === 0 && dx > 0) {
      effectiveDx = dx * 0.25;
    } else if (startIndex === sections.length - 1 && dx < 0) {
      effectiveDx = dx * 0.25;
    }

    const currentTransform =
      track.style.transform || `translateX(calc(${-startIndex * 100}% + ${effectiveDx}px))`;

    // Distance remaining to target in px
    const distancePx = (startIndex - targetIndex) * containerWidth - effectiveDx;
    const absDistance = Math.abs(distancePx);

    let durationMs: number;
    if (Math.abs(velocity) > 0.4) {
      durationMs = Math.max(100, Math.min(220, Math.round(absDistance / Math.abs(velocity))));
    } else {
      durationMs = Math.max(140, Math.min(220, Math.round((absDistance / containerWidth) * 220)));
    }

    // Keep starting and adjacent panes visible through settle
    if (targetIndex !== startIndex) {
      setRevealedPanes([startIndex, targetIndex]);
    } else if (g.adjacentIndex !== null && g.adjacentIndex !== startIndex) {
      setRevealedPanes([startIndex, g.adjacentIndex]);
    }

    const startProgress = Math.min(1, Math.abs(dx) / containerWidth);
    const targetProgress = targetIndex !== startIndex ? 1 : 0;
    const movingToSection =
      targetIndex !== startIndex
        ? sections[targetIndex]
        : g.adjacentIndex !== null && g.adjacentIndex !== startIndex
          ? sections[g.adjacentIndex]
          : undefined;

    let isSettlingCleanedUp = false;
    cancelSettleRef.current = () => {
      isSettlingCleanedUp = true;
    };

    const anim = playTabCarouselSlide(track, currentTransform, `${targetPercent}%`, {
      ...(motion ? { motion } : {}),
      durationMs,
      velocity,
      distancePx,
      reduced: false,
      onProgress: (p: number) => {
        if (isSettlingCleanedUp || phaseRef.current !== 'settling') return;
        const currentP = startProgress + (targetProgress - startProgress) * p;
        dispatchTabSignal(sections[startIndex] ?? activeSection, movingToSection, currentP);
      },
      onFinish: () => {
        if (isSettlingCleanedUp || phaseRef.current !== 'settling') return;
        phaseRef.current = 'idle';
        track.style.transform = `translateX(${targetPercent}%)`;
        currentTransformRef.current = `translateX(${targetPercent}%)`;
        committedIndexRef.current = targetIndex;
        setCommittedIndex(targetIndex);
        setRevealedPanes([targetIndex]);
        dispatchTabSignal(sections[targetIndex] ?? activeSection, undefined, 0);

        // Commit semantic selection exactly once on settle finish
        if (targetIndex !== activeIndexRef.current) {
          selectSection(targetIndex);
        }
      },
    });

    settleAnimationRef.current = anim ?? null;
  };

  // pointercancel MUST restore starting section and clean up
  const cancelGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== event.pointerId) return;

    const track = trackRef.current;
    const container = containerRef.current;
    const wasDragging = g.isDragging;
    const startIndex = g.startIndex;

    if (container && container.hasPointerCapture(event.pointerId)) {
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }

    g.pointerId = null;
    g.isDragging = false;
    g.isLockedHorizontal = false;
    g.isCancelled = false;

    if (!wasDragging || !track || !container) {
      phaseRef.current = 'idle';
      dispatchTabSignal(sections[activeIndexRef.current] ?? activeSection, undefined, 0);
      setRevealedPanes([activeIndexRef.current]);
      return;
    }

    const targetPercent = -startIndex * 100;
    if (reduced) {
      phaseRef.current = 'idle';
      track.style.transform = `translateX(${targetPercent}%)`;
      currentTransformRef.current = `translateX(${targetPercent}%)`;
      committedIndexRef.current = startIndex;
      setCommittedIndex(startIndex);
      setRevealedPanes([startIndex]);
      dispatchTabSignal(sections[startIndex] ?? activeSection, undefined, 0);
      return;
    }

    phaseRef.current = 'settling';
    const containerWidth = container.clientWidth || 393;
    const startProgress = Math.min(1, Math.abs(g.currentDx) / containerWidth);
    const movingToSection =
      g.adjacentIndex !== null && g.adjacentIndex !== startIndex
        ? sections[g.adjacentIndex]
        : undefined;

    let isSettlingCleanedUp = false;
    cancelSettleRef.current = () => {
      isSettlingCleanedUp = true;
    };

    const currentTransform =
      track.style.transform || `translateX(calc(${-startIndex * 100}% + ${g.currentDx}px))`;

    const anim = playTabCarouselSlide(track, currentTransform, `${targetPercent}%`, {
      ...(motion ? { motion } : {}),
      durationMs: 220,
      reduced: false,
      onProgress: (p: number) => {
        if (isSettlingCleanedUp || phaseRef.current !== 'settling') return;
        const currentP = startProgress * (1 - p);
        dispatchTabSignal(sections[startIndex] ?? activeSection, movingToSection, currentP);
      },
      onFinish: () => {
        if (isSettlingCleanedUp || phaseRef.current !== 'settling') return;
        phaseRef.current = 'idle';
        track.style.transform = `translateX(${targetPercent}%)`;
        currentTransformRef.current = `translateX(${targetPercent}%)`;
        committedIndexRef.current = startIndex;
        setCommittedIndex(startIndex);
        setRevealedPanes([startIndex]);
        dispatchTabSignal(sections[startIndex] ?? activeSection, undefined, 0);
      },
    });

    settleAnimationRef.current = anim ?? null;
  };

  return (
    <div
      ref={containerRef}
      data-fp-component="fp.section-carousel"
      data-fp-version="v1"
      className="section-carousel-container"
      style={{ minHeight: 'var(--fp-section-carousel-min-height, 280px)' }}
      aria-label={label}
      onScroll={() => {
        if (containerRef.current && containerRef.current.scrollLeft !== 0) {
          containerRef.current.scrollLeft = 0;
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={cancelGesture}
    >
      <div
        ref={trackRef}
        className="section-carousel-track"
        style={{
          transform:
            phaseRef.current === 'idle'
              ? `translateX(-${committedIndex * 100}%)`
              : (currentTransformRef.current ?? `translateX(-${committedIndex * 100}%)`),
        }}
      >
        {React.Children.map(children, (child, index) => {
          const isRevealed = revealedPanes.includes(index);
          const isCurrent = index === committedIndex;

          return (
            <div
              key={sections[index] ?? index}
              className={`section-carousel-pane ${isCurrent ? 'is-active' : ''}`}
              data-section={sections[index]}
              aria-hidden={!isCurrent}
              inert={!isCurrent}
              style={{
                visibility: isRevealed ? 'visible' : 'hidden',
              }}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default library.version({
  id: 'fp.section-carousel',
  version: 'v1',
  component: SectionCarousel,
  notes:
    'L101 section carousel with horizontal swipe gestures, adjacent pane preview, reduced motion support and tab synchronization.',
  examples: [
    {
      name: 'Interactive swipe sections',
      props: {
        sections: ['ingredients', 'steps', 'planning'],
        defaultSection: 'ingredients',
        label: 'Recipe sections',
        children: [
          React.createElement(
            'div',
            {
              key: 'ingredients',
              style: {
                height: '260px',
                padding: '1.25rem',
                backgroundColor: 'var(--fp-color-surface-container)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.75rem',
              },
            },
            React.createElement('strong', null, '1. Ingredients Pane'),
            React.createElement(
              'p',
              { style: { margin: 0, color: 'var(--fp-color-muted)' } },
              'Swipe left to reveal the Steps section.',
            ),
          ),
          React.createElement(
            'div',
            {
              key: 'steps',
              style: {
                height: '260px',
                padding: '1.25rem',
                backgroundColor: 'var(--fp-color-surface-container)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.75rem',
              },
            },
            React.createElement('strong', null, '2. Steps Pane'),
            React.createElement(
              'p',
              { style: { margin: 0, color: 'var(--fp-color-muted)' } },
              'Swipe right for Ingredients or left for Planning.',
            ),
          ),
          React.createElement(
            'div',
            {
              key: 'planning',
              style: {
                height: '260px',
                padding: '1.25rem',
                backgroundColor: 'var(--fp-color-surface-container)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.75rem',
              },
            },
            React.createElement('strong', null, '3. Planning Pane'),
            React.createElement(
              'p',
              { style: { margin: 0, color: 'var(--fp-color-muted)' } },
              'Swipe right to return to Steps.',
            ),
          ),
        ],
      },
    },
  ],
});
