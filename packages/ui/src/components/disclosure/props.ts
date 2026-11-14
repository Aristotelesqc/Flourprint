import type { ReactNode } from 'react';

export interface DisclosureProps {
  /** Controlled boolean indicating whether the disclosure content is expanded. */
  readonly expanded: boolean;
  /** Callback fired when the user toggles the disclosure button. */
  readonly onExpandedChange: (next: boolean) => void;
  /** Primary label displayed in the trigger button. */
  readonly label: ReactNode;
  /** Collapsible content kept mounted in the DOM to preserve uncontrolled state and scroll. */
  readonly children: ReactNode;
  /** Optional secondary summary displayed below or beside the primary label. */
  readonly summary?: ReactNode | undefined;
  /** Optional base HTML identifier for trigger and content linkage. */
  readonly id?: string | undefined;
  /** Whether the disclosure button is disabled. */
  readonly disabled?: boolean | undefined;
}
