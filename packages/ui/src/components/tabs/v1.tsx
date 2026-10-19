import './v1.css';
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';
import type { TabsProps, TabGestureProgress } from '../../props.ts';
import { library } from '../../index.ts';

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  label,
  variant = 'underlined',
  gestureProgress: propGestureProgress,
}) => {
  const ref = useRef<HTMLElement>(null);
  const motionStyle = useTransitionMotionStyle('fp.motion.highlight', ref);
  const [eventGestureProgress, setEventGestureProgress] = useState<TabGestureProgress | null>(null);

  const activeGesture =
    propGestureProgress !== undefined ? propGestureProgress : eventGestureProgress;

  useEffect(() => {
    const nav = ref.current;
    const selected = nav?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (nav && selected) {
      const navRect = nav.getBoundingClientRect();
      const selRect = selected.getBoundingClientRect();
      if (selRect.left < navRect.left) {
        nav.scrollLeft += selRect.left - navRect.left;
      } else if (selRect.right > navRect.right) {
        nav.scrollLeft += selRect.right - navRect.right;
      }
    }
  }, [activeId]);

  // Listen to shared progress signal via element event if not passed via props
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onGesture = (event: Event) => {
      const detail = (event as CustomEvent<TabGestureProgress | null>).detail;
      setEventGestureProgress(detail ?? null);
    };
    node.addEventListener('fp:tab-gesture', onGesture);
    return () => node.removeEventListener('fp:tab-gesture', onGesture);
  }, []);

  // Geometry computation for variable-width indicator
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    isGesture: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;

    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>('button[role="tab"]'));
    if (!buttons.length) return;

    const fromId = activeGesture?.fromId ?? activeId;
    const toId = activeGesture?.toId;
    const progress = activeGesture?.progress ?? 0;

    const fromIndex = tabs.findIndex((t) => t.id === fromId);
    const toIndex = toId ? tabs.findIndex((t) => t.id === toId) : fromIndex;

    const fromBtn = buttons[fromIndex];
    if (!fromBtn) return;

    const fromLeft = fromBtn.offsetLeft;
    const fromWidth = fromBtn.offsetWidth;

    if (activeGesture && progress !== 0) {
      const toBtn = buttons[toIndex];
      const toLeft = toBtn ? toBtn.offsetLeft : fromLeft;
      const toWidth = toBtn ? toBtn.offsetWidth : fromWidth;

      const currentLeft = fromLeft + (toLeft - fromLeft) * progress;
      const currentWidth = fromWidth + (toWidth - fromWidth) * progress;

      setIndicatorStyle({ left: currentLeft, width: currentWidth, isGesture: true });
    } else {
      setIndicatorStyle({ left: fromLeft, width: fromWidth, isGesture: false });
    }
  }, [tabs, activeId, activeGesture]);

  return (
    <nav
      ref={ref}
      data-fp-component="fp.tabs"
      data-fp-version="v1"
      className={`section-tabs ${variant === 'pills' ? 'tabs-pills' : variant === 'chips' ? 'tabs-chips' : ''} ${indicatorStyle ? 'has-gesture-indicator' : ''}`}
      role="tablist"
      aria-label={label}
    >
      {tabs.map((tab) => {
        const isSelected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`tab-btn ${isSelected ? 'active' : ''}`}
            onKeyDown={(event) => {
              const index = tabs.findIndex((item) => item.id === activeId);
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft'
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabs.length - 1
                        : undefined;
              if (next === undefined || !tabs[next]) return;
              event.preventDefault();
              onChange(tabs[next].id);
              const buttons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
              buttons?.[next]?.focus();
            }}
            onClick={() => onChange(tab.id)}
          >
            <span className="tab-shape" aria-hidden="true" style={motionStyle} />
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
      {variant === 'underlined' && indicatorStyle && (
        <span
          className={`tab-indicator ${indicatorStyle.isGesture ? 'is-dragging' : ''}`}
          aria-hidden="true"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      )}
    </nav>
  );
};

export default library.version({
  id: 'fp.tabs',
  version: 'v1',
  component: Tabs,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Pill selection',
      props: {
        variant: 'pills',
        tabs: [
          { id: 'grouped', label: 'Grouped steps' },
          { id: 'timeline', label: 'Timeline' },
        ],
        activeId: 'grouped',
        onChange: () => {},
        label: 'Process view',
      },
    },
    {
      name: 'Selected',
      props: {
        tabs: [
          { id: 'ingredients', label: 'Ingredients' },
          { id: 'steps', label: 'Steps' },
        ],
        activeId: 'ingredients',
        onChange: () => {},
        label: 'Recipe sections',
      },
    },
  ],
});
