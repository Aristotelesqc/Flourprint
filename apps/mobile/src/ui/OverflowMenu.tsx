import { useIonActionSheet } from '@ionic/react';
import { useRef, useState } from 'react';
import { useMessages } from '../i18n/use-messages';

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
 * Reusable accessible overflow-action component using Ionic overlay primitives.
 * Dismisses the action sheet before executing modal/navigation actions.
 */
export const OverflowMenu = ({ ariaLabel, title, actions }: OverflowMenuProps) => {
  const { t } = useMessages();
  const [presentActionSheet] = useIonActionSheet();
  const trigger = useRef<HTMLButtonElement>(null);
  const opening = useRef(false);
  const selection = useRef<(() => void) | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (opening.current) return;
    opening.current = true;
    selection.current = undefined;
    setOpen(true);
    const validActions = actions.filter((a): a is OverflowAction => a !== 'divider' && !a.disabled);

    void presentActionSheet({
      ...(title === undefined ? {} : { header: title }),
      cssClass: 'fp-overflow-sheet',
      onDidDismiss: () => {
        opening.current = false;
        setOpen(false);
        const selected = selection.current;
        selection.current = undefined;
        if (!trigger.current?.closest('.ion-page-hidden'))
          trigger.current?.focus({ preventScroll: true });
        selected?.();
      },
      buttons: [
        ...validActions.map((action) => ({
          text: action.label,
          ...(action.destructive ? { role: 'destructive' as const } : {}),
          cssClass: action.destructive ? 'fp-menu-separated' : '',
          handler: () => {
            selection.current = action.handler;
          },
        })),
        {
          text: t('bake.cancel'),
          role: 'cancel',
        },
      ],
    });
  };

  return (
    <button
      ref={trigger}
      type="button"
      className="fp-reset flex min-h-touch min-w-touch items-center justify-center rounded-full text-ink hover:bg-surface-container active:bg-track focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={ariaLabel ?? t('recipe.menu')}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={handleOpen}
    >
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
    </button>
  );
};
