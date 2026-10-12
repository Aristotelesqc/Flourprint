import { IonButton, IonButtons, IonHeader, IonToolbar } from '@ionic/react';
import { useId, type ReactNode } from 'react';
import { useMessages } from '../i18n/use-messages';
import { SimulationBanner } from './SimulationBanner';

/**
 * The Flourprint logo (resources/mark.svg): a loaf with three scores under a dimension line, on
 * the launcher icon's visible area. Gradient ids are per instance: Ionic keeps hidden pages, and
 * their app bars, in the DOM.
 */
export const AppMark = () => {
  // useId may contain characters a url(#…) reference does not take.
  const id = `mark${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const cream = '#fbefd9';
  return (
    <svg width="30" height="30" viewBox="18 18 72 72" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2614" />
          <stop offset="1" stopColor="#7d4626" />
        </linearGradient>
        <linearGradient id={`${id}loaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8954e" />
          <stop offset="1" stopColor="#b4561c" />
        </linearGradient>
      </defs>
      <rect x="18" y="18" width="72" height="72" rx="18" fill={`url(#${id}bg)`} />
      <g stroke={cream} strokeLinecap="round" strokeWidth="3.2" fill="none">
        <path d="M34 30V40M74 30V40M39 35H69" />
      </g>
      <path d="M35.5 35 41.5 31.2V38.8ZM72.5 35 66.5 31.2V38.8Z" fill={cream} />
      <path
        d="M30.57 71.33C30.57 54.28 42.28 45.77 54 45.77S77.43 54.28 77.43 71.33C77.43 79.84 65.72 83.04 54 83.04S30.57 79.84 30.57 71.33Z"
        fill={`url(#${id}loaf)`}
      />
      <path
        d="M38.86 70.28Q45.29 66.85 46.78 59.72 40.35 63.15 38.86 70.28ZM47.93 73.09Q57.66 67.75 60.07 56.91 50.34 62.25 47.93 73.09ZM61.22 70.28Q67.65 66.85 69.14 59.72 62.71 63.15 61.22 70.28Z"
        fill={cream}
      />
    </svg>
  );
};

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
