import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { saveRevision } from '@flourprint/core/application';
import {
  applyFormulaEdit,
  resolveFormula,
  validateProcess,
  type DomainError,
  type FormulaEdit,
  type Revision,
} from '@flourprint/core/domain';
import { FormulaSection } from '../blocks/FormulaSection';
import { ProcessSection } from '../blocks/ProcessSection';
import { useMessages } from '../i18n/use-messages';
import { useDrafts, type RecipeDraft } from '../services/drafts';
import { useServices } from '../services/services';

/**
 * A recipe: formula and process tabs over one draft. The draft follows the policy of
 * `services/drafts`; only an explicit save writes a new immutable revision (#7, #23).
 */
export const RecipePage = () => {
  const recipeId = useParams<{ recipeId: string }>().recipeId ?? '';
  const services = useServices();
  const drafts = useDrafts();
  const { t, error } = useMessages();
  const [tab, setTab] = useState<'formula' | 'process'>('formula');
  const [base, setBase] = useState<{ name: string; revision: Revision }>();
  const [draft, setDraft] = useState<RecipeDraft>();
  const [failure, setFailure] = useState<DomainError>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    void (async () => {
      const recipe = await services.recipes.getRecipe(recipeId);
      if (!recipe) return;
      const revision = await services.recipes.getRevision(recipeId, recipe.headVersion);
      if (revision.ok && revision.value) {
        const { formula, process } = revision.value;
        setBase({ name: recipe.name, revision: revision.value });
        setDraft(drafts.get(recipeId, revision.value.version) ?? { formula, process });
      }
    })();
  }, [recipeId, services]);

  const resolved = useMemo(() => (draft ? resolveFormula(draft.formula) : undefined), [draft]);
  if (!base || !draft || !resolved) return <IonPage />;
  const dirty = draft.formula !== base.revision.formula || draft.process !== base.revision.process;

  const update = (next: RecipeDraft) => {
    setDraft(next);
    drafts.set(recipeId, base.revision.version, next);
    setFailure(undefined);
    setNotice(undefined);
  };

  const editFormula = (command: FormulaEdit) => {
    const next = applyFormulaEdit(draft.formula, command);
    if (next.ok) update({ ...draft, formula: next.value });
    else setFailure(next.error);
  };

  const changeDuration = (stepId: string, durationS: number) => {
    const process = {
      steps: draft.process.steps.map((s) =>
        s.id === stepId ? { ...s, plannedDurationS: durationS } : s,
      ),
    };
    const valid = validateProcess(process);
    if (valid.ok) update({ ...draft, process });
    else setFailure(valid.error);
  };

  const save = async () => {
    const saved = await saveRevision(services.recipes, {
      recipeId,
      name: base.name,
      expectedHead: base.revision.version,
      formula: draft.formula,
      process: draft.process,
      createdAt: services.clock.now(),
    });
    if (!saved.ok) {
      setFailure(saved.error);
      return;
    }
    drafts.clear(recipeId);
    setBase({ name: base.name, revision: saved.value });
    setDraft({ formula: saved.value.formula, process: saved.value.process });
    setNotice(t('formula.saved', { version: saved.value.version }));
  };

  const discard = () => {
    drafts.clear(recipeId);
    setDraft({ formula: base.revision.formula, process: base.revision.process });
    setFailure(undefined);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <IonTitle>{base.name}</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={tab}
            onIonChange={(e) => setTab(e.detail.value === 'process' ? 'process' : 'formula')}
          >
            <IonSegmentButton value="formula">
              <IonLabel>{t('recipe.tab.formula')}</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="process">
              <IonLabel>{t('recipe.tab.process')}</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {failure && (
          <p role="alert" className="mb-3 text-[var(--color-alert)]">
            {error(failure)}
          </p>
        )}
        {notice && <p className="mb-3">{notice}</p>}

        {tab === 'formula' ? (
          resolved.ok ? (
            <FormulaSection
              formula={draft.formula}
              resolved={resolved.value}
              onEdit={editFormula}
            />
          ) : (
            <p role="alert">{error(resolved.error)}</p>
          )
        ) : (
          <ProcessSection process={draft.process} onDurationChange={changeDuration} />
        )}

        {dirty && (
          <div className="mt-6 flex flex-col gap-2">
            <IonNote>{t('formula.unsaved')}</IonNote>
            <IonButton expand="block" onClick={() => void save()}>
              {t('formula.save', { version: base.revision.version + 1 })}
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={discard}>
              {t('formula.discard')}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};
