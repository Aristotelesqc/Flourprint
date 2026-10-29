import type { ReactNode } from 'react';

export interface TabItem {
  /** Unique identifier for the tab item. */
  readonly id: string;
  /** Display label for the tab button. */
  readonly label: ReactNode;
  /** Content rendered inside the associated tab panel. Optional when panels are rendered externally. */
  readonly panel?: ReactNode | undefined;
  /** Optional disabled state for this tab item. */
  readonly disabled?: boolean | undefined;
}

export interface TabsProps {
  /** Identifier of the currently selected tab item. */
  readonly selected: string;
  /** Callback fired when a tab is selected. */
  readonly onSelectedChange: (id: string) => void;
  /** Required localized accessible label describing the tab list (applied as aria-label). */
  readonly label: string;
  /** Readonly list of tab items. */
  readonly items: readonly TabItem[];
  /** Whether to render tab panels internally. Defaults to true. When false, caller mounts panels externally. */
  readonly renderPanels?: boolean | undefined;
}
