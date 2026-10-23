import './v1.css';
import React from 'react';
import type { IconProps, IconButtonProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';

const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  imageSrc,
  label,
  onClick,
  disabled = false,
  dataTestId,
  variant = 'default',
}) => {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const motionStyle = useTransitionMotionStyle('fp.motion.press-icon', buttonRef);
  const classNames = ['icon-btn', `icon-btn-${variant}`].join(' ');

  return (
    <button
      ref={buttonRef}
      style={motionStyle}
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
      <span className="icon-button-shape" aria-hidden="true" style={motionStyle} />
      <span className="icon-button-content" style={motionStyle}>
        {imageSrc ? (
          <img className="icon-button-image" src={imageSrc} alt="" />
        ) : (
          <Icon name={icon} />
        )}
      </span>
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
