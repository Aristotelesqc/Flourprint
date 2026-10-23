import './v1.css';
import React, { useRef } from 'react';
import { library } from '../../index.ts';
import type { IconProps, BottomBarProps } from '../../props.ts';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';

const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const BottomBar = ({ variant, children, destinations, navigationLabel }: BottomBarProps) => {
  const navRef = useRef<HTMLElement | null>(null);
  const highlightMotionStyle = useTransitionMotionStyle('fp.motion.highlight', navRef);

  return (
    <>
      {children && (
        <footer
          data-fp-component="fp.bottom-bar"
          data-fp-version="v1"
          className={variant === 'B' ? 'phone-footer toolbar-B' : 'phone-footer'}
        >
          <div className="phone-thumb-bar">{children}</div>
        </footer>
      )}
      {variant === 'B' && destinations && (
        <nav
          ref={navRef}
          data-fp-component="fp.bottom-bar"
          data-fp-version="v1"
          className="phone-bottom-nav"
          aria-label={navigationLabel}
        >
          {destinations.map((item) => (
            <button
              type="button"
              className={`nav-item ${item.selected ? 'active' : ''}`}
              style={highlightMotionStyle}
              key={item.id}
              onClick={item.onSelect}
              aria-current={item.selected ? 'page' : undefined}
            >
              <span className="nav-pill" style={highlightMotionStyle}>
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
};
export default library.version({
  id: 'fp.bottom-bar',
  version: 'v1',
  component: BottomBar,
  notes:
    'A contextual toolbar (prototype selects A, L101); legacy B destinations remain compatible but are not a current candidate.',
  examples: [
    {
      name: 'A contextual toolbar',
      props: {
        variant: 'A',
        navigationLabel: 'Contextual actions',
        children: 'Contextual toolbar actions',
      },
    },
  ],
});
