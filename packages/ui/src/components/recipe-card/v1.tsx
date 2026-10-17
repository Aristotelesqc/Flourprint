import './v1.css';
const MetricPill = (props: MetricPillProps) => (
  <library.Slot component="fp.metric-pill" {...props} />
);
import React from 'react';
import type { IconProps, BadgeProps, MetricPillProps, RecipeCardProps } from '../../props.ts';
import { library } from '../../index.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Badge = (props: BadgeProps) => <library.Slot component="fp.badge" {...props} />;

export const RecipeCard: React.FC<RecipeCardProps> = ({
  title,
  details = [],
  metrics,
  status,
  statusVariant,
  featured = false,
  onOpen,
  actions,
}) => {
  const badgeVariant = statusVariant || (featured ? 'success' : 'default');

  return (
    <div
      data-fp-component="fp.recipe-card"
      data-fp-version="v1"
      className={`recipe-card ${featured ? 'featured' : ''}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="recipe-card-header row">
        <span className="recipe-card-title">{title}</span>
        {featured ? (
          <span className="active-prep-chip tabular">
            <Icon name="clock" size="0.8rem" />
            <span>{status}</span>
          </span>
        ) : (
          <Badge variant={badgeVariant}>{status}</Badge>
        )}
      </div>

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
