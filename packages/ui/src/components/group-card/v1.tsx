import './v1.css';
import React, { useId, useState, useRef } from 'react';
import type { IconProps, BadgeProps, DisclosureProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';

const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Badge = (props: BadgeProps) => <library.Slot component="fp.badge" {...props} />;

export const Disclosure: React.FC<DisclosureProps> = ({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  open,
  onOpenChange,
  status,
  children,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chevronMotionStyle = useTransitionMotionStyle('fp.motion.chevron', rootRef);
  const disclosureMotionStyle = useTransitionMotionStyle('fp.motion.disclosure', rootRef);

  const handleToggle = () => {
    const next = !isOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div
      ref={rootRef}
      data-fp-component="fp.group-card"
      data-fp-version="v1"
      className={`disclosure ${isOpen ? 'open' : ''}`}
    >
      <button
        type="button"
        className="disclosure-header"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={handleToggle}
      >
        <div className="disclosure-headings">
          <div className="row">
            <span className="disclosure-title">{title}</span>
            {status && (
              <Icon
                name={status === 'warning' ? 'warning' : 'check'}
                className={status === 'warning' ? 'warning' : 'semantic-icon'}
              />
            )}
            {badge && <Badge variant="default">{badge}</Badge>}
          </div>
          {subtitle && (
            <span id={`${contentId}-status`} className="disclosure-subtitle muted">
              {subtitle}
            </span>
          )}
        </div>
        <span className="disclosure-chevron" style={chevronMotionStyle}>
          <Icon name="chevronDown" size="1.125rem" />
        </span>
      </button>
      <div
        id={contentId}
        className="disclosure-grid"
        style={disclosureMotionStyle}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="disclosure-inner">
          <div className="disclosure-content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default library.version({
  id: 'fp.group-card',
  version: 'v1',
  component: Disclosure,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Expanded',
      props: {
        title: 'Final dough',
        badge: '600 g',
        defaultOpen: true,
        children: 'Ingredient rows',
      },
    },
    {
      name: 'Collapsed',
      props: { title: 'Tangzhong', badge: '100 g', children: 'Ingredient rows' },
    },
    {
      name: 'Controlled',
      props: {
        title: 'Preferment (controlled)',
        subtitle: 'Synchronized section',
        badge: '150 g',
        open: true,
        onOpenChange: () => {},
        children: 'Controlled ingredient rows',
      },
    },
  ],
});
