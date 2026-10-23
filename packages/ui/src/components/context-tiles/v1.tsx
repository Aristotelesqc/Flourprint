import './v1.css';
import React from 'react';
import type { ContextTilesProps, IconProps, ButtonProps } from '../../props.ts';
import { library } from '../../index.ts';

const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Button = (props: ButtonProps) => <library.Slot component="fp.button" {...props} />;

export const ContextTiles: React.FC<ContextTilesProps> = ({ label, items = [] }) => {
  return (
    <section
      data-fp-component="fp.context-tiles"
      data-fp-version="v1"
      aria-label={label}
      className="context-tiles"
    >
      <div className="context-tiles-grid">
        {items.map((item) => (
          <div key={item.id} className="context-tile">
            <div className="context-tile-header">
              {item.icon && (
                <span className="context-tile-icon" aria-hidden="true">
                  <Icon name={item.icon} size="1rem" />
                </span>
              )}
              <span className="context-tile-label">{item.label}</span>
            </div>
            <div className="context-tile-body">
              <div className="context-tile-data">
                <div className="context-tile-value tabular">{item.value}</div>
                {item.detail && <div className="context-tile-detail">{item.detail}</div>}
              </div>
              {item.onAction && item.actionLabel && (
                <div className="context-tile-action">
                  <Button variant="quiet" onClick={item.onAction}>
                    {item.actionLabel}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default library.version({
  id: 'fp.context-tiles',
  version: 'v1',
  component: ContextTiles,
  notes:
    'Generic 2-column contextual facts tile grid restoring Round 2 preparation tiles. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Read-only facts',
      props: {
        label: 'Process facts',
        items: [
          {
            id: 'ambient-temp',
            label: 'Ambient temperature',
            value: '22 °C',
            detail: 'Room sensor',
            icon: 'temperature',
          },
          {
            id: 'target-end',
            label: 'Estimated end',
            value: '14:30',
            detail: 'Schedule projection',
            icon: 'clock',
          },
        ],
      },
    },
    {
      name: 'Fact with action',
      props: {
        label: 'Equipment status',
        items: [
          {
            id: 'preheat-temp',
            label: 'Preheat setpoint',
            value: '230 °C',
            detail: 'Heating to target',
            icon: 'oven',
            actionLabel: 'Mark ready',
            onAction: () => {},
          },
          {
            id: 'scaled-mass',
            label: 'Target dough mass',
            value: '850 g',
            icon: 'scale',
          },
        ],
      },
    },
  ],
});
