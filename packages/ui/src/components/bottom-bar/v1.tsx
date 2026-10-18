import './v1.css';
import React from 'react';
import { library } from '../../index.ts';
import type { IconProps, BottomBarProps } from '../../props.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const BottomBar = ({ variant, children, destinations, navigationLabel }: BottomBarProps) => (
  <>
    {children && (
      <footer
        data-fp-component="fp.bottom-bar"
        data-fp-version="v1"
        className={`phone-footer toolbar-${variant}`}
      >
        <div className="phone-thumb-bar">{children}</div>
      </footer>
    )}
    {variant === 'B' && destinations && (
      <nav
        data-fp-component="fp.bottom-bar"
        data-fp-version="v1"
        className="phone-bottom-nav"
        aria-label={navigationLabel}
      >
        {destinations.map((item) => (
          <button
            type="button"
            className={`nav-item ${item.selected ? 'active' : ''}`}
            key={item.id}
            onClick={item.onSelect}
            aria-current={item.selected ? 'page' : undefined}
          >
            <span className="nav-pill">
              <Icon name={item.icon} />
              {item.badge && <span className="nav-count">{item.badge}</span>}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    )}
  </>
);
export default library.version({
  id: 'fp.bottom-bar',
  version: 'v1',
  component: BottomBar,
  notes: 'A contextual toolbar; B contextual thumb controls plus four stable destinations.',
  examples: [
    {
      name: 'B navigation',
      props: {
        variant: 'B',
        navigationLabel: 'Main navigation',
        destinations: [
          { id: 'recipes', label: 'Recipes', icon: 'book', selected: true, onSelect: () => {} },
          {
            id: 'preparation',
            label: 'Preparation',
            icon: 'clock',
            selected: false,
            onSelect: () => {},
          },
          { id: 'registry', label: 'Registry', icon: 'flour', selected: false, onSelect: () => {} },
          {
            id: 'settings',
            label: 'Settings',
            icon: 'settings',
            selected: false,
            onSelect: () => {},
          },
        ],
      },
    },
  ],
});
