import './v1.css';
import React from 'react';
import type { SurfaceProps } from '../../props.ts';
import { library } from '../../index.ts';

export const Surface: React.FC<SurfaceProps> = ({
  children,
  className = '',
  variant = 'default',
  componentId,
  componentVersion,
}) => {
  const classNames = ['surface', `surface-${variant}`, className].filter(Boolean).join(' ');
  return (
    <div
      data-fp-component="fp.surface"
      data-fp-version="v1"
      data-fp-container={componentId}
      data-fp-container-version={componentVersion}
      className={classNames}
    >
      {children}
    </div>
  );
};

export default library.version({
  id: 'fp.surface',
  version: 'v1',
  component: Surface,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    { name: 'Surface', props: { children: 'Content' } },
    { name: 'Container', props: { children: 'Content', variant: 'container' } },
  ],
});
