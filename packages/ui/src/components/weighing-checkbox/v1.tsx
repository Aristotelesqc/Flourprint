import './v1.css';
import React, { useId, useRef } from 'react';
import type { IconProps, CheckboxProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';

const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;

export const Checkbox: React.FC<CheckboxProps> = ({
  hideLabel = false,
  checked,
  onChange,
  label,
  disabled = false,
  dataTestId,
}) => {
  const id = useId();
  const rootRef = useRef<HTMLLabelElement | null>(null);
  const checkMotionStyle = useTransitionMotionStyle('fp.motion.check', rootRef);

  return (
    <label
      ref={rootRef}
      data-fp-component="fp.weighing-checkbox"
      data-fp-version="v1"
      htmlFor={id}
      className="checkbox-wrap"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        data-testid={dataTestId}
        className="checkbox-native"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="checkbox-custom" style={checkMotionStyle} aria-hidden="true">
        {checked && <Icon name="check" size="0.875rem" />}
      </span>
      <span className={hideLabel ? 'sr-only' : 'checkbox-text'}>{label}</span>
    </label>
  );
};

export default library.version({
  id: 'fp.weighing-checkbox',
  version: 'v1',
  component: Checkbox,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    { name: 'Not weighed', props: { checked: false, onChange: () => {}, label: 'Weighed' } },
    { name: 'Weighed', props: { checked: true, onChange: () => {}, label: 'Weighed' } },
  ],
});
