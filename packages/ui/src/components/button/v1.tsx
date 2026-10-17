import './v1.css';
import React from 'react';
import type { IconProps, ButtonProps } from '../../props.ts';
import { library } from '../../index.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  icon,
  dataTestId,
  children,
  type = 'button',
  disabled = false,
  className = '',
  ...rest
}) => {
  const classNames = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');
  return (
    <button
      data-fp-component="fp.button"
      data-fp-version="v1"
      type={type}
      disabled={disabled}
      data-testid={dataTestId}
      className={classNames}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children && <span>{children}</span>}
    </button>
  );
};

export default library.version({
  id: 'fp.button',
  version: 'v1',
  component: Button,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    { name: 'Primary', props: { children: 'Save', variant: 'primary' } },
    { name: 'Secondary', props: { children: 'Duration' } },
    { name: 'Disabled', props: { children: 'Save', disabled: true } },
    { name: 'Danger (menu only)', props: { children: 'Move to trash', variant: 'danger' } },
  ],
});
