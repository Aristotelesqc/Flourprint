import { useState } from 'react';
import { en, type MessageKey } from '../i18n/messages';
import { useTemperature } from '../i18n/temperature';
import { useMessages } from '../i18n/use-messages';
import { Ui } from './library';

/** A help topic: the `<topic>` of the `help.<topic>.title` keys. */
export type HelpTopic =
  Extract<MessageKey, `help.${string}.title`> extends `help.${infer T}.title` ? T : never;

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

const InfoSheetContent = ({
  topic,
  open,
  onClose,
}: {
  topic: HelpTopic;
  open: boolean;
  onClose: () => void;
}) => {
  const { t } = useMessages();
  const temperature = useTemperature();
  const [more, setMore] = useState(false);

  const handleDismiss = () => {
    setMore(false);
    onClose();
  };

  // Temperatures named by the explanations, in the device's units (values-and-units.md).
  const values = {
    fridge: temperature.format(4, 'cold'),
    noFriction: temperature.format(0, 'ambient', { difference: true }),
    waterLow: temperature.format(0, 'ambient'),
    waterHigh: temperature.format(60, 'ambient'),
  };

  const paragraphs = (['body1', 'body2', 'body3'] as const).flatMap((part) => {
    const key = `help.${topic}.${part}`;
    return isKey(key) ? [t(key, values)] : [];
  });

  const detailKey = `help.${topic}.more`;
  const detail = isKey(detailKey) ? t(detailKey, values) : undefined;

  return (
    <Ui
      component="fp.bottom-sheet"
      isOpen={open}
      title={t(`help.${topic}.title` as MessageKey)}
      closeLabel={t('help.close')}
      onDismiss={handleDismiss}
    >
      <div className="flex flex-col gap-3 pb-4">
        {paragraphs.map((text) => (
          <p key={text} className="m-0 text-body leading-snug">
            {text}
          </p>
        ))}
        {detail !== undefined && (
          <Ui
            component="fp.disclosure"
            expanded={more}
            onExpandedChange={setMore}
            label={t(more ? 'help.less' : 'help.more')}
          >
            <p className="m-0 text-body leading-snug text-muted">{detail}</p>
          </Ui>
        )}
      </div>
    </Ui>
  );
};

/**
 * A bottom sheet that explains one term: a title, a few short paragraphs and an optional detail
 * behind "Learn more".
 */
export const InfoSheet = ({
  topic,
  open,
  onClose,
}: {
  topic: HelpTopic;
  open: boolean;
  onClose: () => void;
}) => <InfoSheetContent key={topic} topic={topic} open={open} onClose={onClose} />;
