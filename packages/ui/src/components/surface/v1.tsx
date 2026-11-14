import type { ReactElement } from 'react';
import { library } from '../../index.ts';
import type { SurfacePadding, SurfaceProps, SurfaceVariant } from './props.ts';

const variantClasses: Record<SurfaceVariant, string> = {
  surface: 'bg-surface text-on-surface',
  container: 'bg-surface-container text-on-surface',
  outlined: 'bg-surface text-on-surface border border-outline',
};

const paddingClasses: Record<SurfacePadding, string> = {
  compact: 'p-3',
  normal: 'p-4',
  none: 'p-0',
};

export function Surface({
  variant = 'surface',
  padding = 'normal',
  children,
  className,
  ...rest
}: SurfaceProps): ReactElement {
  return (
    <div
      className={`rounded-card min-w-0 ${variantClasses[variant]} ${paddingClasses[padding]} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export default library.version({
  id: 'fp.surface',
  version: 'v1',
  component: Surface,
  notes:
    'Tailwind 4 flat opaque semantic surface container for cards and sections with rounded-card.',
  examples: [
    {
      name: 'Container (Card section)',
      props: {
        variant: 'container',
        padding: 'normal',
        children: 'Dough formulation summary and thermal targets.',
      },
    },
    {
      name: 'Outlined (Compact section)',
      props: {
        variant: 'outlined',
        padding: 'compact',
        children: 'Ambient environment: 24.5°C at 65% RH.',
      },
    },
    {
      name: 'Surface (Base level)',
      props: {
        variant: 'surface',
        padding: 'normal',
        children: 'Main planning workspace and ingredient breakdown.',
      },
    },
  ],
});
