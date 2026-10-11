import { IonButton, IonButtons, IonHeader, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';
import { useMessages } from '../i18n/use-messages';
import { SimulationBanner } from './SimulationBanner';

/** Placeholder mark until the logo exists: a rounded square with an ear of wheat. */
export const AppMark = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
    <g fill="none" stroke="var(--color-on-accent)" strokeWidth="2" strokeLinecap="round">
      <path d="M16 26V9" />
      <path d="M16 13c-2.5-.5-4-2.3-4-4.5 2.5.3 4 1.9 4 4.5zM16 13c2.5-.5 4-2.3 4-4.5-2.5.3-4 1.9-4 4.5z" />
      <path d="M16 19c-2.5-.5-4-2.3-4-4.5 2.5.3 4 1.9 4 4.5zM16 19c2.5-.5 4-2.3 4-4.5-2.5.3-4 1.9-4 4.5z" />
    </g>
  </svg>
);

/** The app's top bar: mark and name on the left, the screen's actions on the right. */
export const AppBar = ({ children }: { children?: ReactNode }) => {
  const { t } = useMessages();
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar>
        <div slot="start" className="flex items-center gap-2 pl-4">
          <AppMark />
          <span className="text-[19px] font-bold tracking-tight">{t('app.title')}</span>
        </div>
        <IonButtons slot="end">{children}</IonButtons>
      </IonToolbar>
      <SimulationBanner />
    </IonHeader>
  );
};

/** A round icon button of the app bar, with an optional count badge. */
export const AppBarButton = ({
  label,
  routerLink,
  onClick,
  count,
  children,
}: {
  label: string;
  routerLink?: string;
  onClick?: () => void;
  count?: number;
  children: ReactNode;
}) => (
  <IonButton
    fill="clear"
    color="medium"
    aria-label={label}
    {...(routerLink === undefined ? {} : { routerLink })}
    {...(onClick === undefined ? {} : { onClick })}
  >
    {/* Clicks go to the button itself: slotted content must not catch them. */}
    <span className="pointer-events-none relative inline-flex">
      {children}
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-accent px-1 text-center text-[11px] leading-4 font-bold text-on-accent">
          {count}
        </span>
      )}
    </span>
  </IonButton>
);

const icon = (path: ReactNode) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

export const TimerIcon = () =>
  icon(
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </>,
  );
export const PlusIcon = () => icon(<path d="M12 5v14M5 12h14" />);
export const MoreIcon = () =>
  icon(
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>,
  );
/** A flour sack: the flour registry. */
export const FlourIcon = () =>
  icon(
    <>
      <path d="M8 4h8l-1 3c3 2 4 5 4 8a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5c0-3 1-6 4-8z" />
      <path d="M9 7h6M10 14h4" />
    </>,
  );
