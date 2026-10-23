import './v1.css';
import React from 'react';
import type { BadgeProps } from '../../props.ts';
import { library } from '../../index.ts';

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const classNames = ['badge', `badge-${variant}`].join(' ');
  return (
    <span data-fp-component="fp.badge" data-fp-version="v1" className={classNames}>
      {children}
    </span>
  );
};

export default library.version({
  id: 'fp.badge',
  version: 'v1',
  component: Badge,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    { name: 'default', props: { children: 'default', variant: 'default' } },
    { name: 'primary', props: { children: 'primary', variant: 'primary' } },
    { name: 'warning', props: { children: 'warning', variant: 'warning' } },
    { name: 'success', props: { children: 'success', variant: 'success' } },
    { name: 'danger', props: { children: 'danger', variant: 'danger' } },
  ],
});
