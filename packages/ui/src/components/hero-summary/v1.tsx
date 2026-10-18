import './v1.css';
const IconButton = (props: IconButtonProps) => (
  <library.Slot component="fp.icon-button" {...props} />
);
import React from 'react';
import type { IconProps, IconButtonProps, SurfaceProps, RecipeSummaryProps } from '../../props.ts';
import { library } from '../../index.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Surface = (props: SurfaceProps) => <library.Slot component="fp.surface" {...props} />;

export const RecipeSummary: React.FC<RecipeSummaryProps> = ({
  editor,
  metrics,
  notice,
  onHelp,
  helpLabel,
  onSizeHelp,
  sizeHelpLabel,
}) => {
  // Partition metrics into 2-column flour/dough, middle hydration, and secondary fat/sugar
  const hydrationMetric = metrics.find((m) => m.icon === 'water') ?? metrics[2];

  const flourMetric = metrics.find((m) => m.icon === 'flour') ?? metrics[0];

  const doughMetric = metrics.find((m) => m.icon === 'scale' && m !== flourMetric) ?? metrics[1];

  const secondaryMetrics = metrics.filter(
    (m) => m !== hydrationMetric && m !== flourMetric && m !== doughMetric,
  );

  return (
    <Surface
      componentId="fp.hero-summary"
      componentVersion="v1"
      variant="container"
      className="recipe-summary-box"
    >
      {/* 2-Column Flour & Dough */}
      <div className="metric-grid-2">
        {flourMetric && (
          <div className="metric-tile">
            <div className="metric-header row">
              <span className="metric-label-group row">
                {flourMetric.icon && (
                  <Icon name={flourMetric.icon} size="0.95rem" className="semantic-icon" />
                )}
                <span>{flourMetric.label}</span>
              </span>
            </div>
            <div className="metric-value tabular">{flourMetric.value}</div>
            {flourMetric.detail && (
              <span className="metric-sub muted tabular">{flourMetric.detail}</span>
            )}
          </div>
        )}
        {doughMetric && (
          <button
            type="button"
            className="metric-tile metric-help"
            onClick={onSizeHelp}
            aria-label={sizeHelpLabel}
            disabled={!onSizeHelp}
          >
            <div className="metric-header row">
              <span className="metric-label-group row">
                {doughMetric.icon && (
                  <Icon name={doughMetric.icon} size="0.95rem" className="semantic-icon" />
                )}
                <span>{doughMetric.label}</span>
                {onSizeHelp && <Icon name="info" size="0.9rem" />}
              </span>
            </div>
            <div className="metric-value tabular">{doughMetric.value}</div>
            {doughMetric.detail && (
              <span className="metric-sub muted tabular">{doughMetric.detail}</span>
            )}
          </button>
        )}
      </div>

      {/* Hydration Across Middle with Breakdown Action */}
      {hydrationMetric && (
        <div className="hydration-summary-box">
          <div className="hydration-info stack">
            <div className="hydration-label-row row">
              {hydrationMetric.icon && (
                <Icon name={hydrationMetric.icon} size="1.1rem" className="semantic-icon" />
              )}
              <span className="hydration-label">{hydrationMetric.label}</span>
              {editor ? (
                <div className="hydration-editor">{editor}</div>
              ) : (
                <span className="hydration-value tabular">{hydrationMetric.value}</span>
              )}
            </div>
            {hydrationMetric.detail && (
              <span className="hydration-detail muted tabular">{hydrationMetric.detail}</span>
            )}
          </div>
          <IconButton icon="info" label={helpLabel} onClick={onHelp} />
        </div>
      )}

      {/* Secondary Fat & Sugar Pair */}
      {secondaryMetrics.length > 0 && (
        <div className="metric-grid-2">
          {secondaryMetrics.map((m, idx) => (
            <div key={idx} className="metric-tile">
              <div className="metric-header row">
                <span className="metric-label-group row">
                  {m.icon && <Icon name={m.icon} size="0.95rem" className="semantic-icon" />}
                  <span>{m.label}</span>
                </span>
              </div>
              <div className="metric-value metric-value-sm tabular">{m.value}</div>
              {m.detail && <span className="metric-sub muted tabular">{m.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Small Explicit Unknown/Partial Notice at Bottom */}
      {notice && (
        <div className="warning-banner" role="status">
          <Icon name="warning" size="0.95rem" />
          <span>{notice}</span>
        </div>
      )}
    </Surface>
  );
};

export default library.version({
  id: 'fp.hero-summary',
  version: 'v1',
  component: RecipeSummary,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Known and partial values',
      props: {
        metrics: [
          { label: 'Flour', value: '314 g', icon: 'flour' },
          { label: 'Dough', value: '699 g', icon: 'scale' },
          { label: 'Hydration', value: '73 %', icon: 'water', detail: 'Known contribution' },
          { label: 'Fat', value: '8 %' },
        ],
        notice: 'Water content of one ingredient is unknown',
        onHelp: () => {},
        helpLabel: 'Details',
      },
    },
  ],
});
