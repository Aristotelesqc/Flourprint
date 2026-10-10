import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { Process, RecipeIssue } from '@flourprint/core/domain';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

/**
 * The recipe check of drafts.md: blocking issues first (they prevent saving and baking), then
 * warnings, each in plain words. Codes come from the engine; texts from the catalog.
 */
export const RecipeChecks = ({
  open,
  issues,
  process,
  onClose,
}: {
  open: boolean;
  issues: readonly RecipeIssue[];
  process: Process;
  onClose: () => void;
}) => {
  const { t, error, stepName, pct } = useMessages();
  const text = (issue: RecipeIssue): string => {
    const details = issue.details ?? {};
    if (issue.severity === 'blocking') {
      const key = `check.${issue.code}`;
      if (isKey(key)) return t(key);
      return error({ code: issue.code, message: String(details.message ?? ''), details });
    }
    const step = process.steps.find((s) => s.id === details.step);
    const key = `check.${issue.code}`;
    if (!isKey(key)) return issue.code;
    return t(key, {
      step: step ? stepName(step) : String(details.step ?? ''),
      pct: typeof details.pct === 'number' ? pct(details.pct) : '',
    });
  };
  const blocking = issues.filter((i) => i.severity === 'blocking');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return (
    <IonModal isOpen={open} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('check.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {issues.length === 0 && <p role="status">{t('check.none')}</p>}
        {blocking.length > 0 && (
          <>
            <p className="m-0 font-semibold text-alert">{t('check.blocking')}</p>
            <IonList>
              {blocking.map((issue, i) => (
                <IonItem key={`b${i}`}>
                  <IonLabel className="ion-text-wrap" role="alert">
                    {text(issue)}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </>
        )}
        {warnings.length > 0 && (
          <>
            <p className="mb-0 font-semibold">{t('check.warnings')}</p>
            <IonList>
              {warnings.map((issue, i) => (
                <IonItem key={`w${i}`}>
                  <IonLabel className="ion-text-wrap">{text(issue)}</IonLabel>
                </IonItem>
              ))}
            </IonList>
          </>
        )}
        <IonButton expand="block" onClick={onClose}>
          {t('explain.close')}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};
