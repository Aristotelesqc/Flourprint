import React from 'react';
import { Icon, type IconName, IconButton, Surface, Badge, Checkbox } from './ui';

export interface RecipeSummaryProps {
  metrics: {
    label: string;
    value: string;
    detail?: string;
    icon?: IconName;
  }[];
  notice?: string;
  onHelp: () => void;
  helpLabel: string;
}

export const RecipeSummary: React.FC<RecipeSummaryProps> = ({
  metrics,
  notice,
  onHelp,
  helpLabel,
}) => {
  return (
    <Surface variant="container" className="recipe-summary-box">
      <div className="recipe-summary-top row">
        <div className="recipe-summary-notice-wrap">
          {notice && <span className="recipe-summary-notice muted">{notice}</span>}
        </div>
        <IconButton icon="info" label={helpLabel} onClick={onHelp} variant="default" />
      </div>
      <div className="metric-grid">
        {metrics.map((m, index) => {
          const isHydration = m.icon === 'water';
          return (
            <div key={index} className={`metric-cell ${isHydration ? 'hydration-cell' : ''}`}>
              <div className="metric-label row">
                {m.icon && <Icon name={m.icon} size="0.875rem" />}
                <span>{m.label}</span>
              </div>
              <div className="metric-value">{m.value}</div>
              {m.detail && <div className="metric-detail muted">{m.detail}</div>}
            </div>
          );
        })}
      </div>
    </Surface>
  );
};

export interface IngredientRowProps {
  id: string;
  name: string;
  gramsText: string;
  pctText: string;
  note?: string;
  checked: boolean;
  onToggle: () => void;
  checkLabel: string;
  editing?: boolean;
  children?: React.ReactNode;
}

export const IngredientRow: React.FC<IngredientRowProps> = ({
  id,
  name,
  gramsText,
  pctText,
  note,
  checked,
  onToggle,
  checkLabel,
  editing = false,
  children,
}) => {
  const handleRowClick = () => {
    onToggle();
  };

  const handleNestedInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      data-testid={`ingredient-row-${id}`}
      className={`ingredient-row ${checked ? 'weighed' : ''} ${editing ? 'editing' : ''}`}
      onClick={handleRowClick}
    >
      <div className="ingredient-row-main row">
        <div onClick={handleNestedInteractiveClick}>
          <Checkbox checked={checked} onChange={() => onToggle()} label={checkLabel} />
        </div>
        <div className="ingredient-info stack">
          <span className="ingredient-name">{name}</span>
          <div className="ingredient-meta row">
            <span className="ingredient-pct muted">{pctText}</span>
            {note && <span className="ingredient-note muted">• {note}</span>}
          </div>
        </div>
      </div>

      <div className="ingredient-row-end" onClick={handleNestedInteractiveClick}>
        {editing && children ? (
          <div className="ingredient-edit-wrap">{children}</div>
        ) : (
          <span className="ingredient-grams">{gramsText}</span>
        )}
      </div>
    </div>
  );
};

export interface StepRowProps {
  number: number;
  title: string;
  details: string[];
  state?: 'planned' | 'running' | 'done';
  onEdit?: () => void;
  editLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const StepRow: React.FC<StepRowProps> = ({
  number,
  title,
  details,
  state = 'planned',
  onEdit,
  editLabel = '',
  actions,
  children,
}) => {
  return (
    <div className={`step-row step-state-${state}`}>
      <div className="step-row-header row">
        <div className="step-number-badge" aria-hidden="true">
          {state === 'done' ? <Icon name="check" size="0.875rem" /> : number}
        </div>
        <div className="step-heading stack">
          <div className="step-title-row row">
            <span className="step-title">{title}</span>
          </div>
          {details.length > 0 && (
            <div className="step-details row muted">
              {details.map((d, i) => (
                <span key={i} className="step-detail-item">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="step-actions-cell row">
          {actions}
          {onEdit && (
            <IconButton icon="edit" label={editLabel} onClick={onEdit} variant="default" />
          )}
        </div>
      </div>
      {children && <div className="step-row-body">{children}</div>}
    </div>
  );
};

export interface RecipeCardProps {
  title: string;
  details: string[];
  status: string;
  onOpen: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ title, details, status, onOpen }) => {
  return (
    <button type="button" className="recipe-card surface surface-default" onClick={onOpen}>
      <div className="recipe-card-header row">
        <span className="recipe-card-title">{title}</span>
        <Badge variant="default">{status}</Badge>
      </div>
      {details.length > 0 && (
        <div className="recipe-card-details row muted">
          {details.map((d, idx) => (
            <span key={idx} className="recipe-card-detail-item">
              {d}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

export interface StatusPanelProps {
  title: string;
  status: 'ok' | 'warning' | 'unavailable';
  message: string;
  children?: React.ReactNode;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ title, status, message, children }) => {
  let badgeVariant: 'success' | 'warning' | 'default' = 'default';
  let iconName: IconName = 'info';

  if (status === 'ok') {
    badgeVariant = 'success';
    iconName = 'check';
  } else if (status === 'warning') {
    badgeVariant = 'warning';
    iconName = 'warning';
  }

  return (
    <Surface variant="container" className="status-panel">
      <div className="status-panel-header row">
        <div className="row">
          <Icon name={iconName} size="1rem" />
          <span className="status-panel-title">{title}</span>
        </div>
        <Badge variant={badgeVariant}>{title}</Badge>
      </div>
      <p className="status-panel-message muted">{message}</p>
      {children && <div className="status-panel-children">{children}</div>}
    </Surface>
  );
};

export interface PreparationTimerProps {
  title: string;
  remaining: string;
  start: string;
  end: string;
  progress: number;
  labels: {
    start: string;
    end: string;
    progress: string;
  };
}

export const PreparationTimer: React.FC<PreparationTimerProps> = ({
  title,
  remaining,
  start,
  end,
  progress,
  labels,
}) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentProgress = Math.round(clampedProgress * 100);

  return (
    <Surface variant="container" className="preparation-timer stack">
      <span className="preparation-timer-title muted">{title}</span>
      <div className="preparation-timer-digits tabular">{remaining}</div>
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
      <div className="preparation-timer-times row muted">
        <span>
          {labels.start}: {start}
        </span>
        <span>
          {labels.end}: {end}
        </span>
      </div>
    </Surface>
  );
};
