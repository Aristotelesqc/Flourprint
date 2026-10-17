import './v1.css';
import React from 'react';
import type { MetricPillProps, IconProps, IconButtonProps, StepRowProps } from '../../props.ts';
import { library } from '../../index.ts';
const MetricPill = (props: MetricPillProps) => (
  <library.Slot component="fp.metric-pill" {...props} />
);
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const IconButton = (props: IconButtonProps) => (
  <library.Slot component="fp.icon-button" {...props} />
);

export const StepRow: React.FC<StepRowProps> = ({
  number,
  icon,
  title,
  details,
  state = 'planned',
  onEdit,
  editLabel = '',
  actions,
  children,
}) => {
  return (
    <div
      data-fp-component="fp.step-node"
      data-fp-version="v1"
      className={`step-row step-state-${state}`}
    >
      <div className="step-number-badge" aria-hidden="true">
        {state === 'done' ? (
          <Icon name="check" size="0.875rem" />
        ) : icon ? (
          <Icon name={icon} size="1rem" />
        ) : (
          number
        )}
      </div>

      <div className="step-body stack">
        <div className="step-title-row row">
          <span className="step-title">
            {icon && <small className="step-ordinal">{number}. </small>}
            {title}
          </span>
        </div>

        {details.length > 0 && (
          <div className="step-details pill-row row">
            {details.map((d, i) => (
              <MetricPill key={i} value={d} />
            ))}
          </div>
        )}

        {children && <div className="step-row-body">{children}</div>}
      </div>

      <div className="step-actions-cell row">
        {actions}
        {onEdit && <IconButton icon="edit" label={editLabel} onClick={onEdit} variant="default" />}
      </div>
    </div>
  );
};

export default library.version({
  id: 'fp.step-node',
  version: 'v1',
  component: StepRow,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Planned',
      props: { number: 1, title: 'Bulk fermentation', details: ['2 h', '22 °C'] },
    },
    { name: 'Completed', props: { number: 1, title: 'Mix', details: ['10 min'], state: 'done' } },
  ],
});
