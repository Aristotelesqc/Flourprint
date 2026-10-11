import { useState } from 'react';
import { useMessages } from '../i18n/use-messages';
import { InfoSheet, type HelpTopic } from './InfoSheet';

/**
 * A small ⓘ button next to a term: opens the explanation sheet of `topic`. `term` is the visible
 * word it explains, used for the accessible name ("Explanation: <term>").
 */
export const InfoButton = ({ topic, term }: { topic: HelpTopic; term: string }) => {
  const { t } = useMessages();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={t('help.button', { term })}
        aria-haspopup="dialog"
        className="fp-reset -m-2.5 inline-flex shrink-0 items-center justify-center p-2.5 align-middle text-accent-text"
        onClick={() => setOpen(true)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      </button>
      <InfoSheet topic={topic} open={open} onClose={() => setOpen(false)} />
    </>
  );
};
