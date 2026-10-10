import {
  IonButton,
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
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';

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
}: {
  open: boolean;
  busy: boolean;
  onBlank: () => void;
  onTemplate: (template: RecipeTemplate) => void;
  onClose: () => void;
}) => {
  const { t } = useMessages();
  const templateName = useTemplateName();
  return (
    <IonModal isOpen={open} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('new.title')}</IonTitle>
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
                  <IonItem
                    key={template.id}
                    button
                    detail
                    disabled={busy}
                    onClick={() => onTemplate(template)}
                  >
                    <IonLabel>{templateName(template.id)}</IonLabel>
                  </IonItem>
                ))}
              </div>
            );
          })}
        </IonList>
        <div className="ion-padding">
          <IonButton expand="block" fill="outline" onClick={onClose}>
            {t('bake.cancel')}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
