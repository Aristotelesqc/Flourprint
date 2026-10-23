import './v1.css';
import React from 'react';
import type {
  IconProps,
  IconButtonProps,
  SurfaceProps,
  RecipeSummaryProps,
  RecipeSummaryMetric,
} from '../../props.ts';
import { library } from '../../index.ts';

const IconButton = (props: IconButtonProps) => (
  <library.Slot component="fp.icon-button" {...props} />
);
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Surface = (props: SurfaceProps) => <library.Slot component="fp.surface" {...props} />;

export const RecipeSummary: React.FC<RecipeSummaryProps> = ({
  editor,
  metrics,
  notice,
  onNotice,
  onHelp,
  helpLabel,
  onSizeHelp,
  sizeHelpLabel,
}) => {
  // Backwards compatibility mappings for legacy callers
  const resolvedMetrics: RecipeSummaryMetric[] = metrics.map((m) => {
    let itemHelp = m.onHelp;
    let itemHelpLabel = m.helpLabel;
    if (!itemHelp) {
      if (m.icon === 'scale' && onSizeHelp) {
        itemHelp = onSizeHelp;
        itemHelpLabel = sizeHelpLabel ?? `${m.label} · Info`;
      } else if (m.icon === 'water' && onHelp) {
        itemHelp = onHelp;
        itemHelpLabel = helpLabel ?? `${m.label} · Info`;
      }
    }
    return {
      ...m,
      ...(itemHelp ? { onHelp: itemHelp, helpLabel: itemHelpLabel } : {}),
    };
  });

  const editorMetric = editor ? resolvedMetrics.find((m) => m.icon === 'water') : undefined;
  const regularMetrics = editorMetric
    ? resolvedMetrics.filter((m) => m !== editorMetric)
    : resolvedMetrics;

  const renderTile = (m: RecipeSummaryMetric, idx: number, isSm = false) => (
    <div key={idx} className="metric-tile">
      <div className="metric-header row">
        <span className="metric-label-group row">
          {m.icon && <Icon name={m.icon} size="0.95rem" className="semantic-icon" />}
          <span>{m.label}</span>
        </span>
      </div>
      <div className="metric-value-row row">
        <div className={`metric-value ${isSm ? 'metric-value-sm ' : ''}tabular`}>{m.value}</div>
        {m.onHelp && <IconButton icon="info" label={m.helpLabel ?? m.label} onClick={m.onHelp} />}
      </div>
      {m.detail && <span className="metric-sub muted tabular">{m.detail}</span>}
    </div>
  );

  return (
    <Surface
      componentId="fp.hero-summary"
      componentVersion="v1"
      variant="container"
      className="recipe-summary-box"
    >
      {editorMetric ? (
        <>
          <div className="metric-grid-2">
            {regularMetrics.slice(0, 2).map((m, idx) => renderTile(m, idx))}
          </div>

          <div className="hydration-summary-box">
            <div className="hydration-info stack">
              <div className="hydration-label-row row">
                {editorMetric.icon && (
                  <Icon name={editorMetric.icon} size="1.1rem" className="semantic-icon" />
                )}
                <span className="hydration-label">{editorMetric.label}</span>
                <div className="hydration-editor">{editor}</div>
              </div>
              {editorMetric.detail && (
                <span className="hydration-detail muted tabular">{editorMetric.detail}</span>
              )}
            </div>
            {editorMetric.onHelp && (
              <IconButton
                icon="info"
                label={editorMetric.helpLabel ?? `${editorMetric.label} · Info`}
                onClick={editorMetric.onHelp}
              />
            )}
          </div>

          {regularMetrics.length > 2 && (
            <div className="metric-grid-2">
              {regularMetrics.slice(2).map((m, idx) => renderTile(m, idx + 2, true))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="metric-grid-2">
            {regularMetrics.slice(0, 2).map((m, idx) => renderTile(m, idx))}
          </div>
          {regularMetrics.length > 2 && (
            <div className="metric-grid-2">
              {regularMetrics.slice(2).map((m, idx) => renderTile(m, idx + 2, true))}
            </div>
          )}
        </>
      )}

      {notice &&
        (onNotice ? (
          <button
            type="button"
            className="warning-banner warning-banner-actionable"
            onClick={onNotice}
          >
            <Icon name="warning" size="0.95rem" />
            <span style={{ flex: 1 }}>{notice}</span>
            <Icon name="info" size="0.9rem" />
          </button>
        ) : (
          <div className="warning-banner" role="status">
            <Icon name="warning" size="0.95rem" />
            <span>{notice}</span>
          </div>
        ))}
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
