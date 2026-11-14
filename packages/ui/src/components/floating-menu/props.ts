import type { ReactNode } from 'react';

export interface FloatingMenuAction {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
}

export interface FloatingMenuProps {
  readonly title: string;
  readonly closeLabel: string;
  readonly actions: readonly FloatingMenuAction[];
  readonly triggerLabel: string;
  readonly triggerContent?: ReactNode;
  readonly scrollHint: string;
}
