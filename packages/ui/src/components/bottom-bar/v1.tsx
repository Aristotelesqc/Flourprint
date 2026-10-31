import type { ReactElement } from 'react';
import { library } from '../../index.ts';
import type { BottomBarProps } from './props.ts';

export function BottomBar({
  children,
  navigationLabel,
  className,
}: BottomBarProps): ReactElement | null {
  if (!children) return null;

  return (
    <div
      data-fp-component="fp.bottom-bar"
      data-fp-version="v1"
      role="toolbar"
      aria-label={navigationLabel}
      className={`bg-surface border-t border-outline-subtle min-h-touch px-2 py-1 flex items-center justify-between gap-1 shrink-0 z-40 w-full max-w-full box-border ${className ?? ''}`}
    >
      <div className="flex items-center justify-between w-full gap-1 flex-nowrap min-w-0">
        {children}
      </div>
    </div>
  );
}

export default library.version({
  id: 'fp.bottom-bar',
  version: 'v1',
  component: BottomBar,
  notes:
    'Tailwind 4 contextual bottom toolbar with flat surface, touch-target controls, and compact action rhythm (L101).',
  examples: [
    {
      name: 'Contextual toolbar',
      props: {
        variant: 'A',
        navigationLabel: 'Contextual actions',
        children: 'Contextual toolbar actions',
      },
    },
  ],
});
