import './v1.css';
import React from 'react';
import type { IconProps, ButtonProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';

const Icon = (props: IconProps) => <library.Slot component="fp.icon" {...props} />;

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  icon,
  dataTestId,
  children,
  type = 'button',
  disabled = false,
  className = '',
  style,
  ...rest
}) => {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const motionStyle = useTransitionMotionStyle('fp.motion.press', buttonRef);
  const classNames = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');
  const mergedStyle: React.CSSProperties = style ? { ...style, ...motionStyle } : motionStyle;

  return (
    <button
      ref={buttonRef}
      style={mergedStyle}
      data-fp-component="fp.button"
      data-fp-version="v1"
      type={type}
      disabled={disabled}
      data-testid={dataTestId}
      className={classNames}
      {...rest}
    >
      <span className="button-shape" aria-hidden="true" style={motionStyle} />
      <span className="button-content" style={motionStyle}>
        {icon && <Icon name={icon} />}
        {children && <span>{children}</span>}
      </span>
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
