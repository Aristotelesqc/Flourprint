import './v1.css';
import React from 'react';
import { library } from '../../index.ts';
import type { IconProps, MetricPillProps } from '../../props.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;
const MetricPill = ({ value, label, icon }: MetricPillProps) => (
  <span className="stat-pill tabular" data-fp-component="fp.metric-pill" data-fp-version="v1">
    {icon && <Icon name={icon} size="0.85rem" />}
    {label && <span className="muted">{label} : </span>}
    <span>{value}</span>
  </span>
);
export default library.version({
  id: 'fp.metric-pill',
  version: 'v1',
  component: MetricPill,
  notes:
    'Compact semantic SVG pictogram with an atomic, tabular value. Labels come from the consumer.',
  examples: [
    { name: 'Hydration', props: { value: '73 %', label: 'Hydration', icon: 'water' } },
    { name: 'Dough weight', props: { value: '699 g', icon: 'scale' } },
  ],
});
