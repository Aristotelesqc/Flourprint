import {
  Children,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { library } from '../../index.ts';
import { isReduced, type KeyframesMotion } from '../../motion.ts';
import { useMotion } from '../../motion-context.ts';
import { playTabCarouselSlide } from '../../motions/tab-carousel/index.ts';
import type { SectionCarouselControl, SectionCarouselProps } from './props.ts';

interface TransitionState {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly dx: number;
  readonly offsetY: number;
  readonly isAnimating: boolean;
}

export function SectionCarousel({
  sections,
  activeSection,
  onChangeSection,
  label,
  children,
  disabled = false,
  control,
  scrollElement,
  getScrollPosition,
  onGestureProgress,
  onBeforeChange,
  className,
}: SectionCarouselProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const currentAnimationRef = useRef<Animation | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [transitionState, setTransitionState] = useState<TransitionState | null>(null);

  const motion = useMotion('fp.motion.tab-carousel') as KeyframesMotion;

  const [reduced, setReduced] = useState(false);
  const checkReduced = useCallback((): boolean => {
    return (
      isReduced(containerRef.current) ||
      (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
  }, []);

  const pointerStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    baseOffset: number;
    isLocked: boolean;
    isCancelled: boolean;
    history: Array<{ x: number; time: number }>;
  } | null>(null);

  useEffect(() => {
    const update = () => {
      const next = checkReduced();
      setReduced(next);
      if (next) {
        currentAnimationRef.current?.cancel();
        currentAnimationRef.current = null;
        pointerStateRef.current = null;
        setTransitionState(null);
        onGestureProgress?.(null);
      }
    };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    let ancestor: HTMLElement | null = containerRef.current;
    while (ancestor) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['data-motion'] });
      ancestor = ancestor.parentElement;
    }
    update();
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, [checkReduced, onGestureProgress]);

  useEffect(() => {
    if (!scrollElement) return;
    const resize = () => setViewportHeight(scrollElement.clientHeight);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(scrollElement);
    return () => observer.disconnect();
  }, [scrollElement]);

  const currentOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const transform = getComputedStyle(track).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  }, []);

  // Imperative handle
  useImperativeHandle(
    control,
    (): SectionCarouselControl => ({
      selectSection(id: string) {
        if (disabled) return;
        if (id === activeSection && !currentAnimationRef.current && !pointerStateRef.current)
          return;
        const targetIdx = sections.indexOf(id);
        if (targetIdx === -1) return;
        const currentIdx = Math.max(0, sections.indexOf(activeSection));

        const visualOffset = currentOffset();
        pointerStateRef.current = null;
        if (currentAnimationRef.current) {
          currentAnimationRef.current.cancel();
          currentAnimationRef.current = null;
        }

        if (checkReduced()) {
          onBeforeChange?.();
          onChangeSection(id);
          return;
        }

        const container = containerRef.current;
        const track = trackRef.current;
        if (!container || !track) {
          onBeforeChange?.();
          onChangeSection(id);
          return;
        }

        const width = container.clientWidth;
        const currentScrollTop = scrollElement?.scrollTop ?? 0;
        const targetSavedScroll = getScrollPosition?.(id) ?? 0;
        const offsetY = currentScrollTop - targetSavedScroll;

        setTransitionState({
          fromIndex: currentIdx,
          toIndex: targetIdx,
          dx: visualOffset + currentIdx * width,
          offsetY,
          isAnimating: true,
        });

        const fromX = visualOffset;
        const toX = -targetIdx * width;
        const distancePx = toX - fromX;

        const anim = playTabCarouselSlide(track, `${fromX}px`, `${toX}px`, {
          motion,
          distancePx,
          onProgress: (p) => {
            onGestureProgress?.({
              fromId: activeSection,
              toId: id,
              progress: p,
            });
          },
          onFinish: () => {
            currentAnimationRef.current = null;
            onBeforeChange?.();
            onChangeSection(id);
            onGestureProgress?.(null);
            setTransitionState(null);
          },
        });
        currentAnimationRef.current = anim ?? null;
      },
      cancel() {
        if (currentAnimationRef.current) {
          currentAnimationRef.current.cancel();
          currentAnimationRef.current = null;
        }
        setTransitionState(null);
        onGestureProgress?.(null);
      },
    }),
    [
      activeSection,
      currentOffset,
      checkReduced,
      disabled,
      getScrollPosition,
      motion,
      onBeforeChange,
      onChangeSection,
      onGestureProgress,
      scrollElement,
      sections,
    ],
  );

  // Cleanup on disabled or unmount
  useEffect(() => {
    if (disabled) {
      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
        currentAnimationRef.current = null;
      }
      pointerStateRef.current = null;
      setTransitionState(null);
      onGestureProgress?.(null);
    }
  }, [disabled, onGestureProgress]);

  useEffect(() => {
    return () => {
      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
        currentAnimationRef.current = null;
      }
    };
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // 24px viewport edge exclusion (Android Back margin)
    if (e.clientX < 24 || e.clientX > window.innerWidth - 24) return;

    // Target exclusions
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (target.closest('button') && target.closest('[data-sortable-id]')) return;
    if (target.closest('ion-modal, ion-popover, ion-alert, [role="dialog"]')) return;

    // Horizontal scroll ancestor exclusion
    let curr: HTMLElement | null = target;
    let isHScroll = false;
    while (curr && curr !== containerRef.current) {
      const style = window.getComputedStyle(curr);
      if (
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        curr.scrollWidth > curr.clientWidth
      ) {
        isHScroll = true;
        break;
      }
      curr = curr.parentElement;
    }
    if (isHScroll) return;

    const width = containerRef.current?.clientWidth ?? 0;
    const baseOffset = currentOffset() + Math.max(0, sections.indexOf(activeSection)) * width;
    if (currentAnimationRef.current) {
      currentAnimationRef.current.cancel();
      currentAnimationRef.current = null;
      setTransitionState((previous) =>
        previous ? { ...previous, dx: baseOffset, isAnimating: false } : null,
      );
    }

    const now = performance.now();
    pointerStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: now,
      baseOffset,
      isLocked: false,
      isCancelled: false,
      history: [{ x: e.clientX, time: now }],
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== e.pointerId || state.isCancelled) return;

    const dx = e.clientX - state.startX + state.baseOffset;
    const dy = e.clientY - state.startY;
    const now = performance.now();

    if (!state.isLocked) {
      const dist = Math.hypot(dx, dy);
      if (dist < 8) return; // 8px slop

      if (Math.abs(dx) > Math.abs(dy) * 1.5) {
        state.isLocked = true;
        try {
          containerRef.current?.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        onBeforeChange?.();
      } else {
        state.isCancelled = true;
        return;
      }
    }

    if (state.isLocked) {
      state.history.push({ x: e.clientX, time: now });
      state.history = state.history.filter((h) => now - h.time <= 120);

      const fromIndex = Math.max(0, sections.indexOf(activeSection));
      const width = containerRef.current?.clientWidth ?? 0;
      const currentScrollTop = scrollElement?.scrollTop ?? 0;

      let targetIdx = fromIndex;
      let effectiveDx = dx;
      let offsetY = 0;

      if (dx < 0) {
        if (fromIndex < sections.length - 1) {
          targetIdx = fromIndex + 1;
          offsetY =
            currentScrollTop - (getScrollPosition?.(sections[targetIdx] ?? activeSection) ?? 0);
        } else {
          effectiveDx = dx * 0.3; // Spring resistance beyond edge
        }
      } else if (dx > 0) {
        if (fromIndex > 0) {
          targetIdx = fromIndex - 1;
          offsetY =
            currentScrollTop - (getScrollPosition?.(sections[targetIdx] ?? activeSection) ?? 0);
        } else {
          effectiveDx = dx * 0.3; // Spring resistance beyond edge
        }
      }

      setTransitionState({
        fromIndex,
        toIndex: targetIdx,
        dx: effectiveDx,
        offsetY,
        isAnimating: false,
      });

      if (targetIdx !== fromIndex) {
        const progress = Math.min(1, Math.max(0, Math.abs(effectiveDx) / width));
        onGestureProgress?.({
          fromId: activeSection,
          toId: sections[targetIdx] ?? activeSection,
          progress,
        });
      }
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    pointerStateRef.current = null;
    if (!state.isLocked || state.isCancelled) {
      setTransitionState(null);
      onGestureProgress?.(null);
      return;
    }

    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const now = performance.now();
    const recent = state.history.filter((h) => now - h.time <= 120);
    const lastPoint = recent[recent.length - 1];
    const firstPoint = recent[0];
    let velocity = 0;
    if (
      lastPoint &&
      firstPoint &&
      now - lastPoint.time <= 120 &&
      lastPoint.time !== firstPoint.time
    ) {
      velocity = (lastPoint.x - firstPoint.x) / (lastPoint.time - firstPoint.time);
    }

    const width = containerRef.current?.clientWidth ?? 0;
    const fromIndex = Math.max(0, sections.indexOf(activeSection));
    const dx = transitionState?.dx ?? 0;
    const targetIdx = transitionState?.toIndex ?? fromIndex;

    const isFlick =
      Math.abs(dx) >= 20 && Math.abs(velocity) > 0.3 && Math.sign(velocity) === Math.sign(dx);
    const passedHalf = Math.abs(dx) > width * 0.5;
    const willCommit = targetIdx !== fromIndex && (isFlick || passedHalf);
    const finalCommitIndex = willCommit ? targetIdx : fromIndex;

    if (checkReduced()) {
      setTransitionState(null);
      if (willCommit) {
        onBeforeChange?.();
        onChangeSection(sections[finalCommitIndex] ?? activeSection);
      }
      onGestureProgress?.(null);
      return;
    }

    const track = trackRef.current;
    if (!track) {
      setTransitionState(null);
      if (willCommit) {
        onBeforeChange?.();
        onChangeSection(sections[finalCommitIndex] ?? activeSection);
      }
      onGestureProgress?.(null);
      return;
    }

    const currentTx = -fromIndex * width + dx;
    const targetTx = -finalCommitIndex * width;
    const distancePx = targetTx - currentTx;

    setTransitionState((prev) => (prev ? { ...prev, isAnimating: true } : null));

    const anim = playTabCarouselSlide(track, `${currentTx}px`, `${targetTx}px`, {
      motion,
      velocity,
      distancePx,
      onProgress: (p) => {
        if (targetIdx !== fromIndex) {
          const fromProgress = Math.abs(dx) / width;
          const currentP = willCommit
            ? fromProgress + (1 - fromProgress) * p
            : fromProgress * (1 - p);
          onGestureProgress?.({
            fromId: activeSection,
            toId: sections[targetIdx] ?? activeSection,
            progress: Math.min(1, Math.max(0, currentP)),
          });
        }
      },
      onFinish: () => {
        currentAnimationRef.current = null;
        setTransitionState(null);
        if (willCommit) {
          onBeforeChange?.();
          onChangeSection(sections[finalCommitIndex] ?? activeSection);
        }
        onGestureProgress?.(null);
      },
    });
    currentAnimationRef.current = anim ?? null;
  };

  const handlePointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    pointerStateRef.current = null;
    if (!state) return;

    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (currentAnimationRef.current) {
      currentAnimationRef.current.cancel();
      currentAnimationRef.current = null;
    }
    setTransitionState(null);
    onGestureProgress?.(null);
  };

  const activeIndex = Math.max(0, sections.indexOf(activeSection));
  const isTransitioning = transitionState !== null && !reduced;
  const fromIndex = transitionState?.fromIndex ?? activeIndex;
  const toIndex = transitionState?.toIndex ?? activeIndex;
  const dx = transitionState?.dx ?? 0;

  const childPanes = Children.toArray(children);

  return (
    <div
      ref={containerRef}
      data-fp-component="fp.section-carousel"
      data-fp-version="v1"
      role="region"
      aria-label={label}
      className={`relative w-full max-w-full overflow-x-clip touch-pan-y select-none ${className ?? ''}`}
      style={{ touchAction: 'pan-y', minHeight: viewportHeight || undefined }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={(event) => {
        // Capturing after horizontal lock transfers the child's implicit touch capture.
        if (event.target === event.currentTarget) handlePointerCancel(event);
      }}
    >
      <div
        ref={trackRef}
        className="relative flex flex-row flex-nowrap w-full"
        style={
          isTransitioning
            ? { transform: `translateX(calc(${-fromIndex * 100}% + ${dx}px))` }
            : { transform: `translateX(${-activeIndex * 100}%)` }
        }
      >
        {sections.map((sectionId, index) => {
          const isActive = index === activeIndex;
          const isFrom = isTransitioning && index === fromIndex;
          const isRevealed = isTransitioning
            ? index >= Math.min(fromIndex, toIndex) && index <= Math.max(fromIndex, toIndex)
            : isActive;

          const child = childPanes[index];

          if (isTransitioning) {
            if (isFrom) {
              return (
                <div
                  key={sectionId}
                  data-carousel-pane={sectionId}
                  aria-hidden={false}
                  className="relative shrink-0 w-full min-w-0"
                  style={{
                    marginLeft: `${fromIndex * 100}%`,
                    transform: 'none',
                    visibility: 'visible',
                  }}
                >
                  {child}
                </div>
              );
            }

            return (
              <div
                key={sectionId}
                data-carousel-pane={sectionId}
                aria-hidden={true}
                inert={true}
                className={`absolute top-0 shrink-0 w-full min-w-0 ${isRevealed ? 'visible' : 'hidden pointer-events-none'}`}
                style={{
                  left: `${index * 100}%`,
                  transform: isRevealed
                    ? `translateY(${(scrollElement?.scrollTop ?? 0) - (getScrollPosition?.(sectionId) ?? 0)}px)`
                    : 'none',
                }}
              >
                {child}
              </div>
            );
          }

          // At rest: active section is relative in normal flow, defining container height.
          if (isActive) {
            return (
              <div
                key={sectionId}
                data-carousel-pane={sectionId}
                aria-hidden={false}
                className="relative shrink-0 w-full min-w-0"
                style={{
                  marginLeft: `${activeIndex * 100}%`,
                  transform: 'none',
                  visibility: 'visible',
                }}
              >
                {child}
              </div>
            );
          }

          return (
            <div
              key={sectionId}
              data-carousel-pane={sectionId}
              aria-hidden={true}
              inert={true}
              className="hidden absolute top-0 shrink-0 w-full min-w-0"
              style={{
                left: `${index * 100}%`,
                transform: 'none',
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

function SectionCarouselDemo(props: SectionCarouselProps): JSX.Element {
  const [active, setActive] = useState(props.activeSection);

  const handleChange = (id: string) => {
    setActive(id);
    props.onChangeSection(id);
  };

  return <SectionCarousel {...props} activeSection={active} onChangeSection={handleChange} />;
}

export default library.version({
  id: 'fp.section-carousel',
  version: 'v1',
  component: SectionCarousel,
  notes:
    'Horizontal swipeable carousel holding screens/panes with synchronized tab indicator, animated commit and velocity continuation (L101, L106, L117).',
  examples: [
    {
      name: 'Three section recipe carousel',
      render: SectionCarouselDemo,
      props: {
        sections: ['formula', 'process', 'history'],
        activeSection: 'formula',
        onChangeSection: () => {},
        label: 'Recipe sections',
        children: [
          <div key="formula" className="p-4 bg-surface">
            Formula content
          </div>,
          <div key="process" className="p-4 bg-surface">
            Process content
          </div>,
          <div key="history" className="p-4 bg-surface">
            History content
          </div>,
        ],
      },
    },
  ],
});

export type {
  SectionCarouselControl,
  SectionCarouselProgressDetail as TabGestureProgress,
} from './props.ts';
