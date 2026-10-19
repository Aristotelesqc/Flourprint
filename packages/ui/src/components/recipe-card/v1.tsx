import './v1.css';
const MetricPill = (props: MetricPillProps) => (
  <library.Slot component="fp.metric-pill" {...props} />
);
import React, { useRef } from 'react';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';
import type { IconProps, BadgeProps, MetricPillProps, RecipeCardProps } from '../../props.ts';
import { library } from '../../index.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Badge = (props: BadgeProps) => <library.Slot component="fp.badge" {...props} />;

export const RecipeCard: React.FC<RecipeCardProps> = ({
  title,
  description,
  selected,
  onResume,
  resumeLabel,
  details = [],
  metrics,
  status,
  statusVariant,
  featured = false,
  onOpen,
  actions,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const motionStyle = useTransitionMotionStyle('fp.motion.highlight', ref);
  const pressStyle = useTransitionMotionStyle('fp.motion.press', ref);
  const badgeVariant = statusVariant || (featured ? 'success' : 'default');

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }
    onOpen();
  };

  return (
    <div
      ref={ref}
      style={motionStyle}
      data-fp-component="fp.recipe-card"
      data-fp-version="v1"
      className={`recipe-card ${featured ? 'featured' : ''} ${selected ? 'selected-template' : ''}`}
      onClick={handleCardClick}
    >
      <div className="recipe-card-header row">
        <button
          type="button"
          className="recipe-card-main-action"
          onClick={onOpen}
          aria-label={title}
          aria-pressed={selected}
        >
          <span className="recipe-card-title">{title}</span>
        </button>
        {featured ? (
          <button
            type="button"
            style={pressStyle}
            className="active-prep-chip tabular"
            aria-label={resumeLabel}
            onClick={(e) => {
              e.stopPropagation();
              onResume?.();
            }}
          >
            <span className="active-prep-shape" aria-hidden="true" style={pressStyle} />
            <Icon name="clock" size="0.8rem" />
            <span>{status}</span>
          </button>
        ) : status ? (
          <Badge variant={badgeVariant}>{status}</Badge>
        ) : null}
      </div>

      {description && <p className="recipe-card-description">{description}</p>}

      {metrics && metrics.length > 0 ? (
        <div className="recipe-card-metrics pill-row row">
          {metrics.map((m, idx) => (
            <MetricPill key={idx} {...m} />
          ))}
        </div>
      ) : (
        details.length > 0 && (
          <div className="recipe-card-details pill-row row">
            {details.map((d, idx) => (
              <MetricPill key={idx} value={d} />
            ))}
          </div>
        )
      )}

      {actions && (
        <div className="recipe-card-actions row" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default library.version({
  id: 'fp.recipe-card',
  version: 'v1',
  component: RecipeCard,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Recipe',
      props: {
        title: 'Milk bread',
        details: ['v1', '3 h 20 min', '699 g'],
        status: 'Never cooked',
        onOpen: () => {},
      },
    },
  ],
});
