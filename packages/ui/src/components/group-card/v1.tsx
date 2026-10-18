import './v1.css';
import React, { useId, useState } from 'react';
import type { IconProps, BadgeProps, DisclosureProps } from '../../props.ts';
import { library } from '../../index.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Badge = (props: BadgeProps) => <library.Slot component="fp.badge" {...props} />;

export const Disclosure: React.FC<DisclosureProps> = ({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  status,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div
      data-fp-component="fp.group-card"
      data-fp-version="v1"
      className={`disclosure ${isOpen ? 'open' : ''}`}
    >
      <button
        type="button"
        className="disclosure-header"
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={status ? title : undefined}
        aria-describedby={status && subtitle ? `${contentId}-status` : undefined}
        onClick={() => setIsOpen(!isOpen)}
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
        <Icon name="chevronDown" size="1.125rem" className="disclosure-chevron" />
      </button>
      <div id={contentId} className="disclosure-grid" aria-hidden={!isOpen} inert={!isOpen}>
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
  ],
});
