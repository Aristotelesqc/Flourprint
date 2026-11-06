import { useIonToast } from '@ionic/react';
import { useEffect } from 'react';
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
  useEffect(() => {
    void present({ message: t(KEYS[outcome]), duration: 6000 });
    // Once per start.
  }, []);
  return null;
};
