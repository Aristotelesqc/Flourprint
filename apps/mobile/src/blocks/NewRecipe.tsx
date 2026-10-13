import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { RECIPE_TEMPLATES } from '@flourprint/core/application';
import type { RecipeTemplate } from '@flourprint/core/domain';
import { useState } from 'react';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';
import { StyleGuide } from './StyleGuide';

const CATEGORIES: readonly RecipeTemplate['category'][] = [
  'bread',
  'enriched',
  'pan',
  'flatbread',
  'pizza',
];
const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

/** The display name of a template, also the base of its drafts' generated names. */
export const useTemplateName = () => {
  const { t } = useMessages();
  return (id: string) => {
    const key = `template.${id}`;
    return isKey(key) ? t(key) : id;
  };
};

/** Choice of a starting point (drafts.md): the blank recipe or a shipped template. */
export const NewRecipe = ({
  open,
  busy,
  onBlank,
  onTemplate,
  onClose,
  onDismissed,
}: {
  open: boolean;
  busy: boolean;
  onBlank: () => void;
  onTemplate: (template: RecipeTemplate) => void;
  onClose: () => void;
  onDismissed?: () => void;
}) => {
  const { t } = useMessages();
  const templateName = useTemplateName();
  // A template opens its style guide first; starting from it is a second, explicit tap.
  const [selected, setSelected] = useState<string>();
  return (
    <IonModal
      isOpen={open}
      canDismiss={!busy}
      onDidDismiss={() => {
        onClose();
        onDismissed?.();
      }}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('new.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton disabled={busy} onClick={onClose} aria-label={t('help.close')}>
              {t('help.close')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem button detail disabled={busy} onClick={onBlank}>
            <IonLabel>
              {t('new.blank')}
              <p>{t('new.blankHint')}</p>
            </IonLabel>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>
              <strong>{t('new.templates')}</strong>
              <p>{t('new.templatesHint')}</p>
            </IonLabel>
          </IonItem>
          {CATEGORIES.map((category) => {
            const templates = RECIPE_TEMPLATES.filter((tpl) => tpl.category === category);
            if (templates.length === 0) return null;
            return (
              <div key={category}>
                <IonListHeader>
                  <IonLabel>{t(`new.category.${category}`)}</IonLabel>
                </IonListHeader>
                {templates.map((template) => (
                  <div key={template.id}>
                    <IonItem
                      button
                      detail={false}
                      disabled={busy}
                      aria-expanded={selected === template.id}
                      onClick={() =>
                        setSelected(selected === template.id ? undefined : template.id)
                      }
                    >
                      <IonLabel>{templateName(template.id)}</IonLabel>
                    </IonItem>
                    {selected === template.id && (
                      <div className="flex flex-col gap-2 px-4 py-3">
                        <StyleGuide template={template} />
                        <IonButton disabled={busy} onClick={() => onTemplate(template)}>
                          {t('guide.use')}
                        </IonButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </IonList>
        <div className="ion-padding">
          <IonButton expand="block" fill="outline" disabled={busy} onClick={onClose}>
            {t('bake.cancel')}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
