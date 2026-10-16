import React, { useId, useState, useEffect, useRef } from 'react';

export type IconName =
  | 'back'
  | 'plus'
  | 'more'
  | 'edit'
  | 'check'
  | 'close'
  | 'clock'
  | 'flour'
  | 'water'
  | 'scale'
  | 'temperature'
  | 'oven'
  | 'note'
  | 'photo'
  | 'book'
  | 'settings'
  | 'arrowUp'
  | 'arrowDown'
  | 'copy'
  | 'undo'
  | 'redo'
  | 'info'
  | 'chevronDown'
  | 'chevronUp'
  | 'menu'
  | 'play'
  | 'lock'
  | 'unlock'
  | 'trash'
  | 'warning'
  | 'library'
  | 'ingredient'
  | 'calendar';

export interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = '1.125rem', className }) => {
  const s: React.CSSProperties = {
    width: size,
    height: size,
    display: 'inline-block',
    verticalAlign: 'middle',
    flexShrink: 0,
  };

  switch (name) {
    case 'back':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      );
    case 'plus':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case 'more':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      );
    case 'edit':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case 'check':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'close':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'clock':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'flour':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M6 22h12a2 2 0 0 0 2-2V8l-6-6-8 6v12a2 2 0 0 0 2 2z" />
          <path d="M14 2v6h6" />
          <path d="M9 15h6" />
          <path d="M12 12v6" />
        </svg>
      );
    case 'water':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    case 'scale':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M12 3v18" />
          <path d="M6 7l6-4 6 4" />
          <path d="M6 7l-4 8h8z" />
          <path d="M18 7l-4 8h8z" />
        </svg>
      );
    case 'temperature':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
    case 'oven':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="7" cy="8" r="1" />
          <circle cx="12" cy="8" r="1" />
          <circle cx="17" cy="8" r="1" />
          <rect x="6" y="12" width="12" height="6" rx="1" />
        </svg>
      );
    case 'note':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'photo':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case 'book':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'settings':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'arrowUp':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      );
    case 'arrowDown':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      );
    case 'copy':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case 'undo':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      );
    case 'redo':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      );
    case 'info':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case 'chevronDown':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case 'chevronUp':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      );
    case 'menu':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case 'play':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      );
    case 'lock':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'unlock':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      );
    case 'trash':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case 'warning':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'library':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="10" x2="16" y2="10" />
        </svg>
      );
    case 'ingredient':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg
          style={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
  }
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: IconName;
  dataTestId?: string;
  children?: React.ReactNode;
}

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

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  dataTestId?: string;
  variant?: 'default' | 'primary' | 'danger';
}

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

export interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'container' | 'high';
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const classNames = ['surface', `surface-${variant}`, className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const classNames = ['badge', `badge-${variant}`].join(' ');
  return <span className={classNames}>{children}</span>;
};

export interface NumberFieldProps {
  value: number;
  label: string;
  unit?: string;
  locale: 'fr' | 'en';
  onCommit: (value: number) => boolean;
  onValidityChange?: (invalid: boolean) => void;
  disabled?: boolean;
  dataTestId?: string;
  errorMessage: string;
  resetKey?: number;
  displayDigits?: number;
}

function formatDisplayValue(val: number, loc: 'fr' | 'en', digits = 2): string {
  if (!Number.isFinite(val)) return '';
  const rounded = Math.round(val * 10 ** digits) / 10 ** digits;
  const str = rounded.toString();
  return loc === 'fr' ? str.replace('.', ',') : str;
}

function parseInputNumber(raw: string): { valid: boolean; value: number } {
  const trimmed = raw.trim();
  if (trimmed === '') return { valid: false, value: NaN };
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return { valid: false, value: NaN };
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { valid: false, value: NaN };
  return { valid: true, value: parsed };
}

export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  label,
  unit,
  locale,
  onCommit,
  onValidityChange,
  disabled = false,
  dataTestId,
  errorMessage,
  resetKey,
  displayDigits = 2,
}) => {
  const inputId = useId();
  const errorId = useId();
  const [rawText, setRawText] = useState<string>(() =>
    formatDisplayValue(value, locale, displayDigits),
  );
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const lastCommittedRef = useRef<number>(value);
  const dirtyRef = useRef(false);
  const previousResetRef = useRef(resetKey);
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;

  useEffect(() => {
    const forcedReset = previousResetRef.current !== resetKey;
    previousResetRef.current = resetKey;
    lastCommittedRef.current = value;
    if (dirtyRef.current && !forcedReset) return;
    dirtyRef.current = false;
    const nextFormatted = formatDisplayValue(value, locale, displayDigits);
    setRawText(nextFormatted);
    setIsInvalid(false);
    onValidityChangeRef.current?.(false);
  }, [value, locale, resetKey, displayDigits]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    dirtyRef.current = true;
    setRawText(text);
    const parsed = parseInputNumber(text);
    const invalid = !parsed.valid;
    setIsInvalid(invalid);
    onValidityChangeRef.current?.(invalid);
  };

  const commitValue = () => {
    if (rawText === '' && !Number.isFinite(lastCommittedRef.current)) {
      setIsInvalid(false);
      onValidityChangeRef.current?.(false);
      return;
    }
    const parsed = parseInputNumber(rawText);
    if (!parsed.valid) {
      setIsInvalid(true);
      onValidityChangeRef.current?.(true);
      return;
    }
    if (
      rawText === formatDisplayValue(lastCommittedRef.current, locale, displayDigits) ||
      parsed.value === lastCommittedRef.current
    ) {
      dirtyRef.current = false;
      setRawText(formatDisplayValue(parsed.value, locale, displayDigits));
      setIsInvalid(false);
      onValidityChangeRef.current?.(false);
      return;
    }
    const success = onCommit(parsed.value);
    if (success) {
      dirtyRef.current = false;
      lastCommittedRef.current = parsed.value;
      dirtyRef.current = false;
      setRawText(formatDisplayValue(parsed.value, locale, displayDigits));
      setIsInvalid(false);
      onValidityChangeRef.current?.(false);
    } else {
      setIsInvalid(true);
      onValidityChangeRef.current?.(true);
    }
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    }
  };

  return (
    <div className={`field ${isInvalid ? 'field-error' : ''}`}>
      <label htmlFor={inputId} className="field-label">
        <span>{label}</span>
      </label>
      <div className="field-input-wrap">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={rawText}
          data-testid={dataTestId}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? errorId : undefined}
          className="field-input"
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {unit && (
          <span className="field-unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      {isInvalid && (
        <span id={errorId} className="field-error-msg" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  dataTestId?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  dataTestId,
}) => {
  const id = useId();
  return (
    <label htmlFor={id} className="checkbox-wrap">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        data-testid={dataTestId}
        className="checkbox-native"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="checkbox-custom" aria-hidden="true">
        {checked && <Icon name="check" size="0.875rem" />}
      </span>
      <span className="checkbox-text">{label}</span>
    </label>
  );
};

export interface TabsProps {
  tabs: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, label }) => {
  return (
    <nav className="section-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const isSelected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`tab-btn ${isSelected ? 'active' : ''}`}
            onKeyDown={(event) => {
              const index = tabs.findIndex((item) => item.id === activeId);
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft'
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabs.length - 1
                        : undefined;
              if (next === undefined) return;
              event.preventDefault();
              onChange(tabs[next].id);
              const buttons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
              buttons?.[next]?.focus();
            }}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export interface DisclosureProps {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Disclosure: React.FC<DisclosureProps> = ({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="disclosure">
      <button
        type="button"
        className="disclosure-header"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="disclosure-headings">
          <div className="row">
            <span className="disclosure-title">{title}</span>
            {badge && <Badge variant="default">{badge}</Badge>}
          </div>
          {subtitle && <span className="disclosure-subtitle muted">{subtitle}</span>}
        </div>
        <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size="1.125rem" />
      </button>
      <div id={contentId} className="disclosure-content" hidden={!isOpen}>
        {children}
      </div>
    </div>
  );
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
    >
      <div className="modal-sheet">
        <header className="modal-header">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </dialog>
  );
};

export interface MenuProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  anchor?: 'top' | 'bottom';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Menu: React.FC<MenuProps> = ({
  open,
  onClose,
  title,
  closeLabel,
  anchor = 'bottom',
  children,
  footer,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`menu-dialog menu-anchor-${anchor}`}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
    >
      <div className="menu-popup">
        <header className="menu-header">
          <h3 id={titleId} className="menu-title">
            {title}
          </h3>
          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </header>
        <div className="menu-body">{children}</div>
        {footer && <footer className="menu-footer">{footer}</footer>}
      </div>
    </dialog>
  );
};
