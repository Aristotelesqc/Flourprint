import {
  Children,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
}

export function SectionCarousel({
  sections,
  activeSection,
  onChangeSection,
  label,
  children,
  disabled = false,
  control,
  gestureElement,
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

  const liveDxRef = useRef(0);
  const liveTargetIdxRef = useRef(0);
  const gestureTargetIdxRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const preventClickRef = useRef(false);

  const motion = useMotion('fp.motion.tab-carousel') as KeyframesMotion;

  const [reduced, setReduced] = useState(false);
  const checkReduced = useCallback((): boolean => {
    return (
      isReduced(containerRef.current) ||
      (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
  }, []);

  useLayoutEffect(() => {
    // Reset imperative tracking at rest, including cancellation with an unchanged selection.
    if ((!transitionState || reduced) && trackRef.current)
      trackRef.current.style.transform = `translate3d(${-Math.max(0, sections.indexOf(activeSection)) * 100}%, 0, 0)`;
  }, [activeSection, reduced, sections, transitionState]);

  const pointerStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseOffset: number;
    isLocked: boolean;
    isCancelled: boolean;
    width: number;
    fromIndex: number;
    history: Array<{ x: number; time: number }>;
    originatingElement: HTMLElement;
  } | null>(null);

  const cancelQueuedFrame = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const next = checkReduced();
      setReduced(next);
      if (next) {
        currentAnimationRef.current?.cancel();
        currentAnimationRef.current = null;
        cancelQueuedFrame();
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
  }, [cancelQueuedFrame, checkReduced, onGestureProgress]);

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
        cancelQueuedFrame();
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
        setTransitionState({
          fromIndex: currentIdx,
          toIndex: targetIdx,
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
        cancelQueuedFrame();
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
      cancelQueuedFrame,
      currentOffset,
      checkReduced,
      disabled,
      motion,
      onBeforeChange,
      onChangeSection,
      onGestureProgress,
      sections,
    ],
  );

  // Cleanup on disabled or unmount
  useEffect(() => {
    if (disabled) {
      cancelQueuedFrame();
      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
        currentAnimationRef.current = null;
      }
      pointerStateRef.current = null;
      setTransitionState(null);
      onGestureProgress?.(null);
    }
  }, [cancelQueuedFrame, disabled, onGestureProgress]);

  useEffect(() => {
    return () => {
      cancelQueuedFrame();
      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
        currentAnimationRef.current = null;
      }
    };
  }, [cancelQueuedFrame]);

  const handlePointerDownInternal = useCallback(
    (
      e: PointerEvent | ReactPointerEvent,
      originatingElement: HTMLElement,
      isFromGestureElement: boolean,
    ) => {
      if (disabled || !e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      preventClickRef.current = false;

      // 24px viewport edge exclusion (Android Back margin)
      if (e.clientX < 24 || e.clientX > window.innerWidth - 24) return;

      // Target exclusions
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (target.closest('button') && target.closest('[data-sortable-id]')) return;
      if (target.closest('ion-modal, ion-popover, ion-alert, [role="dialog"]')) return;

      // Horizontal scroll ancestor exclusion (content pane only; external tab strip must still swipe)
      if (!isFromGestureElement) {
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
      }

      cancelQueuedFrame();
      const width = containerRef.current?.clientWidth ?? 0;
      const currentIdx = Math.max(0, sections.indexOf(activeSection));
      const baseOffset = currentOffset() + currentIdx * width;
      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
        currentAnimationRef.current = null;
        if (trackRef.current)
          trackRef.current.style.transform = `translate3d(${-currentIdx * width + baseOffset}px, 0, 0)`;
      }

      const now = performance.now();
      liveDxRef.current = baseOffset;
      liveTargetIdxRef.current = currentIdx;
      gestureTargetIdxRef.current = null;
      pointerStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        baseOffset,
        isLocked: false,
        isCancelled: false,
        width,
        fromIndex: currentIdx,
        history: [{ x: e.clientX, time: now }],
        originatingElement,
      };
    },
    [activeSection, cancelQueuedFrame, currentOffset, disabled, sections],
  );

  const handlePointerMoveInternal = useCallback(
    (e: PointerEvent | ReactPointerEvent) => {
      const state = pointerStateRef.current;
      if (!state || state.pointerId !== e.pointerId || state.isCancelled) return;

      const pointerDx = e.clientX - state.startX;
      const dx = pointerDx + state.baseOffset;
      const dy = e.clientY - state.startY;
      const now = performance.now();

      if (!state.isLocked) {
        const dist = Math.hypot(pointerDx, dy);
        if (dist < 8) return; // 8px slop

        if (Math.abs(pointerDx) > Math.abs(dy) * 1.5) {
          state.isLocked = true;
          try {
            state.originatingElement.setPointerCapture(e.pointerId);
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

        const fromIndex = state.fromIndex;
        const width = state.width;

        let targetIdx = fromIndex;
        let effectiveDx = dx;

        if (dx < 0) {
          if (fromIndex < sections.length - 1) {
            targetIdx = fromIndex + 1;
          } else {
            effectiveDx = dx * 0.3; // Spring resistance beyond edge
          }
        } else if (dx > 0) {
          if (fromIndex > 0) {
            targetIdx = fromIndex - 1;
          } else {
            effectiveDx = dx * 0.3; // Spring resistance beyond edge
          }
        }

        liveDxRef.current = effectiveDx;
        liveTargetIdxRef.current = targetIdx;

        if (gestureTargetIdxRef.current !== targetIdx) {
          gestureTargetIdxRef.current = targetIdx;
          setTransitionState({ fromIndex, toIndex: targetIdx });
        }

        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            if (checkReduced()) return;
            const track = trackRef.current;
            const curDx = liveDxRef.current;
            const curTargetIdx = liveTargetIdxRef.current;
            if (track) {
              track.style.transform = `translate3d(calc(${-fromIndex * 100}% + ${curDx}px), 0, 0)`;
            }
            if (curTargetIdx !== fromIndex && width > 0) {
              const progress = Math.min(1, Math.max(0, Math.abs(curDx) / width));
              onGestureProgress?.({
                fromId: activeSection,
                toId: sections[curTargetIdx] ?? activeSection,
                progress,
              });
            } else {
              onGestureProgress?.(null);
            }
          });
        }
      }
    },
    [activeSection, checkReduced, onBeforeChange, onGestureProgress, sections],
  );

  const handlePointerUpInternal = useCallback(
    (e: PointerEvent | ReactPointerEvent) => {
      const state = pointerStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;
      if (state.isLocked && !state.isCancelled) handlePointerMoveInternal(e);
      pointerStateRef.current = null;
      cancelQueuedFrame();

      if (!state.isLocked || state.isCancelled) {
        setTransitionState(null);
        onGestureProgress?.(null);
        return;
      }

      preventClickRef.current = true;

      try {
        state.originatingElement.releasePointerCapture(e.pointerId);
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
      const dx = liveDxRef.current;
      const targetIdx = liveTargetIdxRef.current;

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

      const anim = playTabCarouselSlide(track, `${currentTx}px`, `${targetTx}px`, {
        motion,
        velocity,
        distancePx,
        onProgress: (p) => {
          if (targetIdx !== fromIndex && width > 0) {
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
    },
    [
      activeSection,
      cancelQueuedFrame,
      checkReduced,
      handlePointerMoveInternal,
      motion,
      onBeforeChange,
      onChangeSection,
      onGestureProgress,
      sections,
    ],
  );

  const handlePointerCancelInternal = useCallback(
    (e: PointerEvent | ReactPointerEvent) => {
      const state = pointerStateRef.current;
      pointerStateRef.current = null;
      cancelQueuedFrame();
      if (!state) return;

      try {
        state.originatingElement.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (currentAnimationRef.current) {
        currentAnimationRef.current.cancel();
        currentAnimationRef.current = null;
      }
      setTransitionState(null);
      onGestureProgress?.(null);
    },
    [cancelQueuedFrame, onGestureProgress],
  );

  const handlersRef = useRef({
    onPointerDown: handlePointerDownInternal,
    onPointerMove: handlePointerMoveInternal,
    onPointerUp: handlePointerUpInternal,
    onPointerCancel: handlePointerCancelInternal,
  });
  handlersRef.current = {
    onPointerDown: handlePointerDownInternal,
    onPointerMove: handlePointerMoveInternal,
    onPointerUp: handlePointerUpInternal,
    onPointerCancel: handlePointerCancelInternal,
  };

  useEffect(() => {
    if (!gestureElement) return;
    const onDown = (e: PointerEvent) => handlersRef.current.onPointerDown(e, gestureElement, true);
    const onMove = (e: PointerEvent) => handlersRef.current.onPointerMove(e);
    const onUp = (e: PointerEvent) => handlersRef.current.onPointerUp(e);
    const onCancel = (e: PointerEvent) => handlersRef.current.onPointerCancel(e);
    const onLostCapture = (e: PointerEvent) => {
      if (e.target === gestureElement) {
        handlersRef.current.onPointerCancel(e);
      }
    };
    const onClickCapture = (e: MouseEvent) => {
      if (preventClickRef.current && e.detail > 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        preventClickRef.current = false;
      }
    };

    gestureElement.addEventListener('pointerdown', onDown);
    gestureElement.addEventListener('pointermove', onMove);
    gestureElement.addEventListener('pointerup', onUp);
    gestureElement.addEventListener('pointercancel', onCancel);
    gestureElement.addEventListener('lostpointercapture', onLostCapture);
    gestureElement.addEventListener('click', onClickCapture, true);

    return () => {
      gestureElement.removeEventListener('pointerdown', onDown);
      gestureElement.removeEventListener('pointermove', onMove);
      gestureElement.removeEventListener('pointerup', onUp);
      gestureElement.removeEventListener('pointercancel', onCancel);
      gestureElement.removeEventListener('lostpointercapture', onLostCapture);
      gestureElement.removeEventListener('click', onClickCapture, true);
    };
  }, [gestureElement]);

  const activeIndex = Math.max(0, sections.indexOf(activeSection));
  const isTransitioning = transitionState !== null && !reduced;
  const fromIndex = transitionState?.fromIndex ?? activeIndex;
  const toIndex = transitionState?.toIndex ?? activeIndex;

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
      onPointerDown={(e) => handlePointerDownInternal(e, e.currentTarget, false)}
      onPointerMove={handlePointerMoveInternal}
      onPointerUp={handlePointerUpInternal}
      onPointerCancel={handlePointerCancelInternal}
      onClickCapture={(e) => {
        if (preventClickRef.current && e.detail > 0) {
          e.preventDefault();
          e.stopPropagation();
          preventClickRef.current = false;
        }
      }}
      onLostPointerCapture={(event) => {
        // Capturing after horizontal lock transfers the child's implicit touch capture.
        if (event.target === event.currentTarget) handlePointerCancelInternal(event);
      }}
    >
      <div ref={trackRef} className="relative flex flex-row flex-nowrap w-full">
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
