import './v1.css';
import React from 'react';
import type { BadgeProps, SurfaceProps, PreparationTimerProps } from '../../props.ts';
import { library } from '../../index.ts';
const Surface = (props: SurfaceProps) => <library.Slot component="fp.surface" {...props} />;

const Badge = (props: BadgeProps) => <library.Slot component="fp.badge" {...props} />;
export const PreparationTimer: React.FC<PreparationTimerProps> = ({
  title,
  remaining,
  remainingLabel,
  start,
  end,
  progress,
  labels,
  instruction,
  conditions,
}) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentProgress = Math.round(clampedProgress * 100);

  return (
    <Surface
      componentId="fp.prep-hero"
      componentVersion="v1"
      variant="container"
      className="preparation-timer stack"
    >
      <div className="preparation-timer-header row">
        <Badge variant="primary">{title}</Badge>
        <span className="tabular muted">
          {labels.end} {end}
        </span>
      </div>

      <div className="preparation-time">
        <span className="preparation-remaining-label">{remainingLabel}</span>
        <div className="preparation-timer-digits tabular">{remaining}</div>
      </div>

      {instruction && <p className="preparation-instruction">{instruction}</p>}

      <div
        className="preparation-timer-progress-track"
        role="progressbar"
        aria-valuenow={percentProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={labels.progress}
      >
        <div className="preparation-timer-progress-fill" style={{ width: `${percentProgress}%` }} />
      </div>

      <div className="preparation-timer-times row muted tabular">
        <span>
          {labels.start} {start}
        </span>
      </div>

      {conditions && conditions.length > 0 && (
        <div className="prep-conditions">
          {conditions.map((c, i) => (
            <div key={i} className="prep-condition">
              <span className="prep-condition-label">{c.label}</span>
              <span className="prep-condition-value tabular">{c.value}</span>
              {c.sub && <span className="prep-condition-note muted">{c.sub}</span>}
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
};

export default library.version({
  id: 'fp.prep-hero',
  version: 'v1',
  component: PreparationTimer,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Active',
      props: {
        title: 'Remaining',
        remaining: '1 h 12 min',
        start: '09:00',
        end: '11:00',
        progress: 0.4,
        labels: { start: 'Started:', end: 'Expected end:', progress: 'Progress' },
      },
    },
  ],
});
