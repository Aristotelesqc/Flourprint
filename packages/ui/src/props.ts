import type React from 'react';

export type IconName =
  | 'back'
  | 'plus'
  | 'more'
  | 'edit'
  | 'check'
  | 'close'
  | 'clock'
  | 'flour'
  | 'fat'
  | 'sugar'
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

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: IconName;
  dataTestId?: string;
  children?: React.ReactNode;
}

export interface IconButtonProps {
  imageSrc?: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  dataTestId?: string;
  variant?: 'default' | 'primary' | 'danger';
}

export interface SurfaceProps {
  componentId?: string;
  componentVersion?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'container' | 'high';
}

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'danger';
}

export interface NumberFieldProps {
  compact?: boolean;
  hint?: string;
  value: number;
  label: string;
  unit?: string;
  unitPosition?: 'prefix' | 'suffix';
  locale: 'fr' | 'en';
  onCommit: (value: number) => boolean;
  onClear?: () => boolean;
  onValidityChange?: (invalid: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  disabled?: boolean;
  dataTestId?: string;
  errorMessage: string;
  resetKey?: number;
  displayDigits?: number;
}

export interface CheckboxProps {
  hideLabel?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  dataTestId?: string;
}

export interface TabGestureProgress {
  /** The id of the current/from tab */
  readonly fromId: string;
  /** The id of the adjacent/to tab being swiped to */
  readonly toId?: string;
  /** Normalized progress from 0 (at fromId) to 1 (at toId) */
  readonly progress: number;
}

export interface TabsProps {
  variant?: 'underlined' | 'pills' | 'chips';
  tabs: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
  /** Optional real-time gesture progress during horizontal swipe (L101) */
  gestureProgress?: TabGestureProgress | null;
}

export interface DisclosureProps {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  status?: 'warning' | 'success';
  children: React.ReactNode;
}

export interface ModalProps {
  previewTrigger?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export interface MenuProps {
  previewTrigger?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  anchor?: 'top' | 'bottom';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export interface RecipeSummaryProps {
  editor?: React.ReactNode;
  metrics: {
    label: string;
    value: string;
    detail?: string;
    icon?: IconName;
  }[];
  notice?: string;
  onHelp: () => void;
  helpLabel: string;
  onSizeHelp?: () => void;
  sizeHelpLabel?: string;
}

export interface IngredientRowProps {
  id: string;
  name: string;
  gramsText: string;
  pctText: string;
  note?: string;
  checked: boolean;
  onToggle: () => void;
  checkLabel: string;
  editing?: boolean;
  children?: React.ReactNode;
}

export interface StepRowProps {
  icon?: IconName;
  number?: number;
  title: string;
  details: string[];
  state?: 'planned' | 'running' | 'done';
  onEdit?: () => void;
  editLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export interface RecipeCardMetric {
  label?: string;
  value: string;
  icon?: IconName;
}

export interface RecipeCardProps {
  description?: string;
  selected?: boolean;
  onResume?: () => void;
  resumeLabel?: string;
  title: string;
  details?: string[];
  metrics?: RecipeCardMetric[];
  status: string;
  statusVariant?: 'default' | 'primary' | 'warning' | 'success' | 'danger';
  featured?: boolean;
  onOpen: () => void;
  actions?: React.ReactNode;
}

export interface StatusPanelProps {
  embedded?: boolean;
  title: string;
  status: 'ok' | 'warning' | 'unavailable';
  message: string;
  children?: React.ReactNode;
}

export interface PreparationTimerProps {
  remainingLabel?: string;
  title: string;
  remaining: string;
  start: string;
  end: string;
  progress: number;
  labels: {
    start: string;
    end: string;
    progress: string;
  };
  instruction?: string;
  conditions?: { label: string; value: string; sub?: string }[];
}

export interface BottomBarProps {
  variant: 'A' | 'B';
  children?: React.ReactNode;
  destinations?: {
    id: string;
    label: string;
    icon: IconName;
    selected: boolean;
    badge?: string;
    onSelect: () => void;
  }[];
  navigationLabel: string;
}

export interface MetricPillProps {
  value: string;
  label?: string;
  icon?: IconName;
  compact?: boolean;
}

export interface TimelineProps {
  startLabel: string;
  endLabel: string;
  lanes: {
    id: string;
    label: string;
    events: { id: string; label: string; range: string; startPct: number; endPct: number }[];
  }[];
}

export interface ContextTilesProps {
  label: string;
  items: readonly {
    id: string;
    label: string;
    value: string;
    detail?: string;
    icon?: IconName;
    actionLabel?: string;
    onAction?: () => void;
  }[];
}

export interface SectionCarouselProps {
  readonly sections: readonly string[];
  readonly activeSection?: string;
  readonly defaultSection?: string;
  readonly onChangeSection?: (section: string) => void;
  readonly label: string;
  readonly reduced?: boolean;
  readonly onGestureProgress?: (progress: TabGestureProgress | null) => void;
  readonly targetTabsElement?: HTMLElement | null;
  readonly children: React.ReactNode;
}
