import './v1.css';
import React from 'react';
import type {
  IconProps,
  SurfaceProps,
  BadgeProps,
  StatusPanelProps,
  IconName,
} from '../../props.ts';
import { library } from '../../index.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const Surface = (props: SurfaceProps) => <library.Slot component="fp.surface" {...props} />;
const Badge = (props: BadgeProps) => <library.Slot component="fp.badge" {...props} />;

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
    <Surface
      componentId="fp.warning-banner"
      componentVersion="v1"
      variant="container"
      className="status-panel"
    >
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

export default library.version({
  id: 'fp.warning-banner',
  version: 'v1',
  component: StatusPanel,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Out of domain',
      props: {
        title: 'Estimate unavailable',
        status: 'unavailable',
        message: 'The model does not support these conditions.',
      },
    },
    {
      name: 'Warning',
      props: { title: 'Estimate', status: 'warning', message: 'Extrapolation: enriched dough.' },
    },
  ],
});
