import React from 'react';
import type { StepNodeProps } from './props.ts';
import { library } from '../../index.ts';

export const StepNode: React.FC<StepNodeProps> = ({
  number,
  icon,
  label,
  details,
  actions,
  highlighted = false,
  children,
  className = '',
  ...rest
}) => {
  // Use a stable width threshold when text scaling or a sortable reparent invalidates layout.
  return (
    <div
      data-fp-component="fp.step-node"
      data-fp-version="v1"
      className={`@container relative w-full ${className}`}
      {...rest}
    >
      <div
        className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] @max-[344px]:grid-cols-[2rem_minmax(0,1fr)] items-center gap-1 rounded-card border border-outline-subtle px-2 py-1 min-h-touch ${
          highlighted ? 'bg-surface-container-high ring-2 ring-primary' : 'bg-surface-container'
        }`}
      >
        <div
          aria-hidden="true"
          className="col-start-1 row-start-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-outline-subtle bg-surface-container-high text-supporting font-bold text-on-surface"
        >
          {icon ?? number}
        </div>

        <div className="col-start-2 row-start-1 min-w-0 text-supporting font-bold leading-snug text-on-surface [overflow-wrap:break-word]">
          {icon && number !== undefined && <span className="text-muted">{number}. </span>}
          <span>{label}</span>
        </div>

        {actions && (
          <div className="col-start-3 row-start-1 ml-auto flex shrink-0 items-center justify-end gap-1 min-h-touch min-w-touch @max-[344px]:col-start-2 @max-[344px]:row-start-2">
            {actions}
          </div>
        )}

        {details && (
          <div className="col-span-full flex w-full flex-wrap items-center gap-1">{details}</div>
        )}

        {children && (
          <div className="col-span-full flex min-w-0 flex-col gap-1 text-supporting text-muted empty:hidden">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default library.version({
  id: 'fp.step-node',
  version: 'v1',
  component: StepNode,
  notes: 'Compact tonal step node port with container queries.',
  examples: [
    {
      name: 'Planned',
      props: { number: 1, label: 'Bulk fermentation' },
    },
  ],
});
