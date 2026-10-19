import React, { useRef, useEffect, useState } from 'react';
import type { Section } from './model';
import type { Locale } from './messages';
import { navCopyT } from './navigation-copy';
import {
  playTabCarouselSlide,
  useTabCarouselMotion,
} from '../../../../packages/ui/src/motions/tab-carousel';
import './section-carousel.css';

export interface SectionCarouselProps {
  readonly sections: readonly Section[];
  readonly activeSection: Section;
  readonly onChangeSection: (section: Section) => void;
  readonly locale: Locale;
  readonly reduced: boolean;
  readonly children: React.ReactNode;
}

export function SectionCarousel({
  sections,
  activeSection,
  onChangeSection,
  locale,
  reduced,
  children,
}: SectionCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, sections.indexOf(activeSection));

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Consume motion from MotionProvider
  const motion = useTabCarouselMotion();

  // Track visible panes to ensure inactive panes are inert & hidden when stationary
  const [revealedPanes, setRevealedPanes] = useState<number[]>([activeIndex]);

  useEffect(() => {
    setRevealedPanes([activeIndex]);
  }, [activeIndex]);

  const gestureRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    velocityX: number;
    pointerId: number | null;
    isLockedHorizontal: boolean;
    isCancelled: boolean;
    isDragging: boolean;
    currentDx: number;
    adjacentIndex: number | null;
  }>({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    pointerId: null,
    isLockedHorizontal: false,
    isCancelled: false,
    isDragging: false,
    currentDx: 0,
    adjacentIndex: null,
  });

  const dispatchTabSignal = (fromId: string, toId?: string, progress: number = 0) => {
    const tabs = containerRef.current?.closest('.phone-frame')?.querySelector('.section-tabs');
    if (tabs) {
      tabs.dispatchEvent(
        new CustomEvent('fp:tab-gesture', {
          bubbles: true,
          detail: toId ? { fromId, toId, progress } : null,
        }),
      );
    }
  };

  // Slide track to activeIndex when activeSection changes externally
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (gestureRef.current.isDragging) return;

    const targetPercent = -activeIndex * 100;
    if (containerRef.current && containerRef.current.scrollLeft !== 0) {
      containerRef.current.scrollLeft = 0;
    }
    if (reduced) {
      track.style.transform = `translateX(${targetPercent}%)`;
    } else {
      const currentTransform =
        track.style.transform || `translateX(${-activeIndexRef.current * 100}%)`;
      playTabCarouselSlide(track, currentTransform, `${targetPercent}%`, {
        motion,
        durationMs: 220,
        reduced: false,
        onFinish: () => {
          setRevealedPanes([activeIndex]);
          if (containerRef.current && containerRef.current.scrollLeft !== 0) {
            containerRef.current.scrollLeft = 0;
          }
        },
      });
    }
  }, [activeIndex, reduced, motion]);

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

    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocityX: 0,
      pointerId: event.pointerId,
      isLockedHorizontal: false,
      isCancelled: false,
      isDragging: false,
      currentDx: 0,
      adjacentIndex: null,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== event.pointerId || g.isCancelled) return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    // L101: A swipe starts only on a clearly horizontal gesture; vertical scrolling wins otherwise
    if (!g.isLockedHorizontal) {
      const distance = Math.hypot(dx, dy);
      if (distance < 8) return; // gesture slop

      if (Math.abs(dy) > Math.abs(dx)) {
        g.isCancelled = true;
        return;
      }

      g.isLockedHorizontal = true;
      g.isDragging = true;
      try {
        containerRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // pointer capture fallback
      }
    }

    const now = performance.now();
    const dt = now - g.lastTime;
    if (dt > 0) {
      g.velocityX = (event.clientX - g.lastX) / dt;
    }
    g.lastX = event.clientX;
    g.lastTime = now;
    g.currentDx = dx;

    const container = containerRef.current;
    const containerWidth = container?.clientWidth || 393;

    // Identify adjacent pane and reveal only adjacent pane during swipe
    let adj = activeIndexRef.current;
    if (dx < 0 && activeIndexRef.current < sections.length - 1) {
      adj = activeIndexRef.current + 1;
    } else if (dx > 0 && activeIndexRef.current > 0) {
      adj = activeIndexRef.current - 1;
    }
    g.adjacentIndex = adj;
    if (adj !== activeIndexRef.current) {
      setRevealedPanes([activeIndexRef.current, adj]);
    }

    // Send progress signal to Tabs so indicator follows finger
    const progress = Math.min(1, Math.abs(dx) / containerWidth);
    const toId = adj !== activeIndexRef.current ? sections[adj] : undefined;
    dispatchTabSignal(sections[activeIndexRef.current], toId, progress);

    // L101: In reduced motion, no direct follow animation
    if (reduced) return;

    const track = trackRef.current;
    if (track) {
      let effectiveDx = dx;
      if (activeIndexRef.current === 0 && dx > 0) {
        effectiveDx = dx * 0.25;
      } else if (activeIndexRef.current === sections.length - 1 && dx < 0) {
        effectiveDx = dx * 0.25;
      }

      const basePercent = -activeIndexRef.current * 100;
      track.style.transform = `translateX(calc(${basePercent}% + ${effectiveDx}px))`;
    }
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== event.pointerId) return;

    const track = trackRef.current;
    const container = containerRef.current;
    const wasDragging = g.isDragging;

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
    dispatchTabSignal(sections[activeIndexRef.current], undefined, 0);

    if (!wasDragging || !track || !container) {
      setRevealedPanes([activeIndexRef.current]);
      return;
    }

    const dx = g.currentDx;
    const velocity = g.velocityX;
    const containerWidth = container.clientWidth || 393;
    const dragThreshold = containerWidth / 2;
    const flickVelocityThreshold = 0.3;

    let targetIndex = activeIndexRef.current;

    const draggedNext = dx < -dragThreshold;
    const draggedPrev = dx > dragThreshold;
    const flickedNext = dx < -20 && velocity < -flickVelocityThreshold;
    const flickedPrev = dx > 20 && velocity > flickVelocityThreshold;

    if ((draggedNext || flickedNext) && activeIndexRef.current < sections.length - 1) {
      targetIndex = activeIndexRef.current + 1;
    } else if ((draggedPrev || flickedPrev) && activeIndexRef.current > 0) {
      targetIndex = activeIndexRef.current - 1;
    }

    const targetPercent = -targetIndex * 100;

    // L101: In reduced motion, instant commit without sliding animation
    if (reduced) {
      track.style.transform = `translateX(${targetPercent}%)`;
      setRevealedPanes([targetIndex]);
      if (targetIndex !== activeIndexRef.current) {
        onChangeSection(sections[targetIndex]);
      }
      return;
    }

    const currentTransform =
      track.style.transform || `translateX(${-activeIndexRef.current * 100}%)`;

    const distancePx = Math.abs(dx - (targetIndex - activeIndexRef.current) * containerWidth);
    let durationMs: number;
    if (Math.abs(velocity) > 0.4) {
      durationMs = Math.max(100, Math.min(220, Math.round(distancePx / Math.abs(velocity))));
    } else {
      durationMs = Math.max(140, Math.min(220, Math.round((distancePx / containerWidth) * 220)));
    }

    if (targetIndex !== activeIndexRef.current) {
      onChangeSection(sections[targetIndex]);
    }

    playTabCarouselSlide(track, currentTransform, `${targetPercent}%`, {
      motion,
      durationMs,
      reduced: false,
      onFinish: () => {
        track.style.transform = `translateX(${targetPercent}%)`;
        setRevealedPanes([targetIndex]);
      },
    });
  };

  // Defect 3: pointercancel MUST always restore starting section
  const cancelGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== event.pointerId) return;

    const track = trackRef.current;
    const container = containerRef.current;
    const wasDragging = g.isDragging;

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
    dispatchTabSignal(sections[activeIndexRef.current], undefined, 0);

    if (!wasDragging || !track) {
      setRevealedPanes([activeIndexRef.current]);
      return;
    }

    const targetPercent = -activeIndexRef.current * 100;
    if (reduced) {
      track.style.transform = `translateX(${targetPercent}%)`;
      setRevealedPanes([activeIndexRef.current]);
    } else {
      playTabCarouselSlide(track, track.style.transform, `${targetPercent}%`, {
        motion,
        durationMs: 220,
        reduced: false,
        onFinish: () => {
          track.style.transform = `translateX(${targetPercent}%)`;
          setRevealedPanes([activeIndexRef.current]);
        },
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="section-carousel-container"
      aria-label={navCopyT(locale, 'carouselLabel')}
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
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {React.Children.map(children, (child, index) => {
          const isRevealed = revealedPanes.includes(index);
          const isCurrent = index === activeIndex;

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
}
