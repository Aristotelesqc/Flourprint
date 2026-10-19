import './v1.css';
import React, { useEffect, useRef } from 'react';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';
import type { TabsProps } from '../../props.ts';
import { library } from '../../index.ts';

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  label,
  variant = 'underlined',
}) => {
  const ref = useRef<HTMLElement>(null);
  const motionStyle = useTransitionMotionStyle('fp.motion.highlight', ref);
  useEffect(() => {
    const selected = ref.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeId]);
  return (
    <nav
      ref={ref}
      data-fp-component="fp.tabs"
      data-fp-version="v1"
      className={`section-tabs ${variant === 'pills' ? 'tabs-pills' : variant === 'chips' ? 'tabs-chips' : ''}`}
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
