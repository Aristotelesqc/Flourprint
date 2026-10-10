import { IonContent, IonModal } from '@ionic/react';
import { useState } from 'react';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';

/** A help topic: the `<topic>` of the `help.<topic>.title` keys. */
export type HelpTopic =
  Extract<MessageKey, `help.${string}.title`> extends `help.${infer T}.title` ? T : never;

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

/**
 * A bottom sheet that explains one term: a title, a few short paragraphs and an optional detail
 * behind "Learn more". Swipe down, tap outside or press Close to dismiss it.
 */
export const InfoSheet = ({
  topic,
  open,
  onClose,
}: {
  topic: HelpTopic;
  open: boolean;
  onClose: () => void;
}) => {
  const { t } = useMessages();
  const [more, setMore] = useState(false);
  const paragraphs = (['body1', 'body2', 'body3'] as const).flatMap((part) => {
    const key = `help.${topic}.${part}`;
    return isKey(key) ? [t(key)] : [];
  });
  const detailKey = `help.${topic}.more`;
  const detail = isKey(detailKey) ? t(detailKey) : undefined;
  return (
    <IonModal
      isOpen={open}
      onDidDismiss={() => {
        setMore(false);
        onClose();
      }}
      breakpoints={[0, 0.7, 0.95]}
      initialBreakpoint={0.7}
      handleBehavior="cycle"
    >
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl">{t(`help.${topic}.title` as MessageKey)}</h2>
            <button
              type="button"
              aria-label={t('help.close')}
              className="fp-reset -m-2 shrink-0 p-2 text-muted"
              onClick={onClose}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {paragraphs.map((text) => (
            <p key={text} className="m-0 text-[16px] leading-snug">
              {text}
            </p>
          ))}
          {detail !== undefined && (
            <>
              {more && <p className="m-0 text-[16px] leading-snug text-muted">{detail}</p>}
              <button
                type="button"
                aria-expanded={more}
                className="fp-reset min-h-11 self-start font-semibold text-accent-text"
                onClick={() => setMore(!more)}
              >
                {t(more ? 'help.less' : 'help.more')}
              </button>
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
