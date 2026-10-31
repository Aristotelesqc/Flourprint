import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { isReduced, library, transitionCss, useMotion } from '../../index.ts';
import type { ButtonProps, ButtonVariant } from './props.ts';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'text-on-primary before:bg-primary hover:before:opacity-90 active:before:opacity-80',
  secondary:
    'text-on-surface before:bg-surface-container before:border before:border-outline hover:before:bg-surface active:before:bg-surface-container',
  quiet:
    'text-action-text before:bg-transparent hover:before:bg-surface-container active:before:bg-surface-container',
  danger:
    'text-error before:bg-surface before:border before:border-error hover:before:bg-surface-container active:before:bg-surface-container',
};

export function Button({
  ref: forwardedRef,
  variant = 'primary',
  icon,
  fullWidth = false,
  children,
  type = 'button',
  disabled,
  className,
  style,
  ...rest
}: ButtonProps): ReactElement {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(forwardedRef, () => buttonRef.current as HTMLButtonElement, []);
  const [reduced, setReduced] = useState(false);
  const pressMotion = useMotion('fp.motion.press');

  useEffect(() => {
    const updateReduced = (): void => {
      setReduced(isReduced(buttonRef.current));
    };
    updateReduced();

    const mediaQuery =
      typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    mediaQuery?.addEventListener('change', updateReduced);

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(updateReduced);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-motion'],
        subtree: true,
      });
    }

    return () => {
      mediaQuery?.removeEventListener('change', updateReduced);
      observer?.disconnect();
    };
  }, []);

  const transition =
    pressMotion.kind === 'transition' ? transitionCss(pressMotion, reduced) : undefined;

  const mergedStyle: CSSProperties = {
    ...style,
    ...(transition ? { transition } : {}),
  };

  const visualClass = disabled
    ? 'text-muted before:bg-surface-container before:border before:border-outline cursor-not-allowed pointer-events-none'
    : variantClasses[variant];
  const scaleClass = !reduced && !disabled ? 'active:scale-[0.97]' : '';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      style={mergedStyle}
      className={`fp-control-reset group relative inline-flex min-h-touch min-w-touch items-center justify-center px-4 text-body font-medium select-none fp-focus before:content-[''] before:absolute before:inset-x-0 before:inset-y-1 before:rounded-full before:-z-0 ${visualClass} ${scaleClass} ${widthClass} ${className ?? ''}`}
      {...rest}
    >
      <span className="relative z-10 inline-flex min-w-0 items-center justify-center gap-2">
        {icon ? (
          <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
        ) : null}
        {children}
      </span>
    </button>
  );
}

export default library.version({
  id: 'fp.button',
  version: 'v1',
  component: Button,
  notes:
    'Tailwind 4 pill button with 48px touch target and 40px visual pill via before:inset-y-1, press motion and semantic tokens.',
  examples: [
    {
      name: 'Primary (Standard action)',
      props: {
        variant: 'primary',
        children: 'Continue to Mix',
      },
    },
    {
      name: 'Secondary (Quiet auxiliary)',
      props: {
        variant: 'secondary',
        children: 'Adjust Hydration',
      },
    },
    {
      name: 'Danger (Destructive)',
      props: {
        variant: 'danger',
        children: 'Discard Session',
      },
    },
    {
      name: 'Quiet (Subtle action)',
      props: {
        variant: 'quiet',
        children: 'View History',
      },
    },
    {
      name: 'Disabled (Neutral legible)',
      props: {
        variant: 'primary',
        disabled: true,
        children: 'Bake in Progress',
      },
    },
    {
      name: 'Full Width (Narrow viewport)',
      props: {
        variant: 'primary',
        fullWidth: true,
        children: 'Confirm Fermentation Target',
      },
    },
  ],
});
