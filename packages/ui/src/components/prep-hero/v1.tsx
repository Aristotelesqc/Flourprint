import './v1.css';
import React from 'react';
import type { BadgeProps, SurfaceProps, PreparationTimerProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useMotion } from '../../motion-context.ts';
import { durationMs, easingCurve, formOf } from '../../motion.ts';
import { useReducedMotion } from '../use-transition-motion.ts';
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
  heading,
  stepLine,
  adjustment,
  countdownLabel,
  progressLabel,
  countdownControls,
  progressionControls,
  pausedBadge,
  overdueBadge,
}) => {
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const clampedProgress = Math.max(0, Math.min(1, safeProgress));
  const percentProgress = Math.round(clampedProgress * 100);
  const stepKey = stepLine ?? title;
  const stepRef = React.useRef<HTMLDivElement>(null);
  const prevStepRef = React.useRef(stepKey);
  const animRef = React.useRef<Animation | null>(null);
  const motion = useMotion('fp.motion.highlight');
  const reduced = useReducedMotion(stepRef);

  React.useEffect(() => {
    if (reduced) {
      animRef.current?.cancel();
      animRef.current = null;
    }
    if (prevStepRef.current !== stepKey) {
      prevStepRef.current = stepKey;
      animRef.current?.cancel();
      animRef.current = null;
      const element = stepRef.current;
      const form = motion.kind === 'transition' ? formOf(motion, reduced) : 'none';
      if (element && form !== 'none' && motion.kind === 'transition') {
        const anim = element.animate(
          [
            { backgroundColor: motion.demo.from['background-color'] },
            { backgroundColor: motion.demo.to['background-color'] },
            { backgroundColor: motion.demo.from['background-color'] },
          ],
          {
            duration: durationMs(form.duration),
            easing: easingCurve(form.easing),
          },
        );
        animRef.current = anim;
        anim.finished.then(
          () => {
            if (animRef.current === anim) animRef.current = null;
          },
          () => undefined,
        );
      }
    }
  }, [stepKey, motion, reduced]);
  React.useEffect(() => () => animRef.current?.cancel(), []);

  return (
    <Surface
      componentId="fp.prep-hero"
      componentVersion="v1"
      variant="container"
      className="preparation-timer prep-active-hero stack"
    >
      {heading && (
        <h2 className="prep-heading" data-testid="prep-heading">
          {heading}
        </h2>
      )}

      {stepLine && (
        <div ref={stepRef} className="prep-step-line" data-testid="prep-step-line">
          {stepLine}
        </div>
      )}

      {!heading && (
        <div ref={!stepLine ? stepRef : undefined} className="preparation-timer-header row">
          <Badge variant="primary">{title}</Badge>
          <span className="tabular muted">
            {labels.end} {end}
          </span>
        </div>
      )}

      <div className="prep-countdown-block stack" data-testid="prep-countdown">
        <div className="row" style={{ alignItems: 'baseline', gap: 'var(--fp-space-2, 0.5rem)' }}>
          <span className="prep-countdown-label">{remainingLabel ?? labels.progress}</span>
          {pausedBadge && (
            <span className="prep-hold-badge" data-testid="prep-paused-badge">
              {pausedBadge}
            </span>
          )}
          {overdueBadge && (
            <span className="prep-overdue-badge" data-testid="prep-overdue-badge">
              {overdueBadge}
            </span>
          )}
        </div>
        <div className="prep-countdown-digits tabular" data-testid="prep-countdown-digits">
          {remaining}
        </div>
        {(start || end) && (
          <div className="prep-timer-times row muted tabular" data-testid="prep-step-times">
            {start && (
              <span>
                {labels.start} {start}
              </span>
            )}
            {end && (
              <span>
                {labels.end} {end}
              </span>
            )}
          </div>
        )}
      </div>

      {adjustment && (
        <div className="prep-adjustment-block" data-testid="prep-step-adjustment">
          {adjustment}
        </div>
      )}

      {countdownControls && (
        <div className="prep-group-container stack">
          {countdownLabel && <span className="prep-row-label">{countdownLabel}</span>}
          <div
            className="prep-countdown-row row"
            role="group"
            aria-label={countdownLabel}
            data-testid="prep-countdown-row"
          >
            {countdownControls}
          </div>
        </div>
      )}

      {progressionControls && (
        <div className="prep-group-container stack">
          {progressLabel && <span className="prep-row-label">{progressLabel}</span>}
          <div
            className="prep-progression-row row"
            role="group"
            aria-label={progressLabel}
            data-testid="prep-progression-row"
          >
            {progressionControls}
          </div>
        </div>
      )}

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
    {
      name: 'L127 Active Step',
      props: {
        title: 'Pointage en masse',
        heading: 'Préparation · Campagne au levain',
        stepLine: '2 / 6 · Pointage en masse',
        remaining: '02:30:00',
        remainingLabel: 'Temps restant estimé',
        start: '09:00',
        end: '11:30',
        progress: 0.25,
        labels: { start: 'Début réel :', end: 'Fin d’étape prévue :', progress: 'Progression' },
        adjustment: 'Ajustement : +0 min',
        countdownLabel: 'Compte à rebours',
        progressLabel: 'Progression',
      },
    },
  ],
});
