import { useMessages } from '../i18n/use-messages';
import { Ui } from './library';

export interface OverflowAction {
  readonly label: string;
  readonly handler: () => void;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
}

export interface OverflowMenuProps {
  readonly ariaLabel?: string;
  readonly title?: string;
  readonly actions: readonly (OverflowAction | 'divider')[];
}

/**
 * Reusable accessible overflow-action component rendering fp.floating-menu.
 * Library primitives manage opener focus, keyboard navigation, and dismissal.
 */
export const OverflowMenu = ({ ariaLabel, title, actions }: OverflowMenuProps) => {
  const { t } = useMessages();
  const defaultLabel = ariaLabel ?? t('recipe.menu');

  const menuActions = actions.flatMap((action, index) => {
    if (action === 'divider') return [];
    return [
      {
        id: String(index),
        label: action.label,
        onSelect: action.handler,
        ...(action.destructive !== undefined ? { destructive: action.destructive } : {}),
        ...(action.disabled !== undefined ? { disabled: action.disabled } : {}),
      },
    ];
  });

  return (
    <Ui
      component="fp.floating-menu"
      title={title ?? defaultLabel}
      triggerLabel={defaultLabel}
      closeLabel={t('help.close')}
      scrollHint={t('ui.menu.scrollHint')}
      actions={menuActions}
      triggerContent={
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      }
    />
  );
};
