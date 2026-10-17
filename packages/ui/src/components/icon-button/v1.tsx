import './v1.css';
import React from 'react';
import type { IconProps, IconButtonProps } from '../../props.ts';
import { library } from '../../index.ts';
const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  dataTestId,
  variant = 'default',
}) => {
  const classNames = ['icon-btn', `icon-btn-${variant}`].join(' ');
  return (
    <button
      data-fp-component="fp.icon-button"
      data-fp-version="v1"
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={dataTestId}
      className={classNames}
    >
      <Icon name={icon} />
    </button>
  );
};

export default library.version({
  id: 'fp.icon-button',
  version: 'v1',
  component: IconButton,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    { name: 'Default', props: { icon: 'more', label: 'More actions', onClick: () => {} } },
    { name: 'Disabled', props: { icon: 'undo', label: 'Undo', disabled: true, onClick: () => {} } },
  ],
});
