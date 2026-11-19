import { useIonToast } from '@ionic/react';
import { useEffect, useRef } from 'react';
import { useMessages } from '../i18n/use-messages';
import type { CopyOutcome } from '../services/dev-versions';

const KEYS = {
  copied: 'advanced.versions.copyDone',
  notEmpty: 'advanced.versions.copyNotEmpty',
  failed: 'advanced.versions.copyFailed',
} as const;

/** Dev apps (ADR 0023): says once, at the first screen, what "copy my data to this version" did. */
export const CopyNotice = ({ outcome }: { outcome: CopyOutcome }) => {
  const { t } = useMessages();
  const [present] = useIonToast();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    void present({ message: t(KEYS[outcome]), duration: 6000 });
  }, [outcome, present, t]);
  return null;
};
