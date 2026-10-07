import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { saveRevision } from '@flourprint/core/application';
import {
  applyFormulaEdit,
  resolveFormula,
  type DomainError,
  type FormulaEdit,
  type Revision,
} from '@flourprint/core/domain';
import { NumberField } from '../blocks/NumberField';
import { WaterExplanation } from '../blocks/WaterExplanation';
import { useMessages } from '../i18n/use-messages';
import { useDrafts } from '../services/drafts';
import { useServices } from '../services/services';

/**
 * Formula screen: the draft lives in React state while the page is in the Ionic stack; it is
 * only persisted by an explicit save, which creates a new immutable revision (#7, #23).
 */
export const FormulaPage = () => {
  const recipeId = useParams<{ recipeId: string }>().recipeId ?? '';
  const services = useServices();
  const drafts = useDrafts();
  const { t, grams, pct, error } = useMessages();
  const [base, setBase] = useState<{ name: string; revision: Revision }>();
  const [draft, setDraft] = useState<Revision['formula']>();
  const [failure, setFailure] = useState<DomainError>();
  const [notice, setNotice] = useState<string>();
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    void (async () => {
      const recipe = await services.recipes.getRecipe(recipeId);
      if (!recipe) return;
      const revision = await services.recipes.getRevision(recipeId, recipe.headVersion);
      if (revision.ok && revision.value) {
        setBase({ name: recipe.name, revision: revision.value });
        setDraft(drafts.get(recipeId, revision.value.version) ?? revision.value.formula);
      }
    })();
  }, [recipeId, services]);

  const resolved = useMemo(() => (draft ? resolveFormula(draft) : undefined), [draft]);
  if (!base || !draft || !resolved) return <IonPage />;
  const dirty = draft !== base.revision.formula;

  const edit = (command: FormulaEdit) => {
    const next = applyFormulaEdit(draft, command);
    setNotice(undefined);
    if (next.ok) {
      setDraft(next.value);
      drafts.set(recipeId, base.revision.version, next.value);
      setFailure(undefined);
    } else {
      setFailure(next.error);
    }
  };

  const save = async () => {
    const saved = await saveRevision(services.recipes, {
      recipeId,
      name: base.name,
      expectedHead: base.revision.version,
      formula: draft,
      process: base.revision.process,
      createdAt: services.clock.now(),
    });
    if (!saved.ok) {
      setFailure(saved.error);
      return;
    }
    drafts.clear(recipeId);
    setBase({ name: base.name, revision: saved.value });
    setDraft(saved.value.formula);
    setNotice(t('formula.saved', { version: saved.value.version }));
  };

  const anchor = draft.anchor;
  const anchorText =
    anchor.kind === 'pieces'
      ? t('formula.anchor.pieces', { count: anchor.count, grams: grams(anchor.gramsEach) })
      : t(`formula.anchor.${anchor.kind}`, { grams: grams(anchor.grams) });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <IonTitle>{base.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="mb-3 text-[var(--color-muted)]">{anchorText}</p>
        {failure && (
          <p role="alert" className="mb-3 text-[var(--color-alert)]">
            {error(failure)}
          </p>
        )}
        {notice && <p className="mb-3">{notice}</p>}
        {resolved.ok && (
          <>
            <div className="grid grid-cols-[1fr_7rem_7rem] items-center gap-x-2">
              <span className="font-semibold">{t('formula.column.ingredient')}</span>
              <span className="text-right font-semibold">{t('formula.column.bakerPct')}</span>
              <span className="text-right font-semibold">{t('formula.column.grams')}</span>
              {Object.entries(resolved.value.flourByFlour).map(([id, flourGrams]) => (
                <Row
                  key={id}
                  label={id}
                  pctText={pct((100 * flourGrams) / resolved.value.flourTotal)}
                >
                  <NumberField
                    label={id}
                    unit="g"
                    value={flourGrams}
                    onCommit={(value) =>
                      edit({ type: 'SetIngredientGrams', ingredient: id, grams: value })
                    }
                  />
                </Row>
              ))}
              {draft.ingredients.map((ingredient) => (
                <Row
                  key={ingredient.id}
                  label={ingredient.id}
                  pct={
                    <NumberField
                      label={`${ingredient.id} %`}
                      unit="%"
                      value={ingredient.bakerPct}
                      onCommit={(value) =>
                        edit({ type: 'SetBakerPct', ingredient: ingredient.id, pct: value })
                      }
                    />
                  }
                >
                  <NumberField
                    label={ingredient.id}
                    unit="g"
                    value={resolved.value.grams[ingredient.id] ?? 0}
                    onCommit={(value) =>
                      edit({ type: 'SetIngredientGrams', ingredient: ingredient.id, grams: value })
                    }
                  />
                </Row>
              ))}
            </div>

            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1">
              <dt>{t('formula.total.flour')}</dt>
              <dd className="text-right">{grams(resolved.value.flourTotal)}</dd>
              <dt>{t('formula.total.dough')}</dt>
              <dd className="text-right">{grams(resolved.value.doughWeight)}</dd>
              <dt>{t('formula.total.pureWater')}</dt>
              <dd className="text-right">
                {grams(resolved.value.pureWaterTotal)} · {pct(resolved.value.pureWaterPct)}
              </dd>
              <dt>{t('formula.total.water')}</dt>
              <dd className="text-right">
                <button
                  type="button"
                  className="min-h-[var(--spacing-touch)] text-[var(--color-crust)] underline decoration-dotted"
                  onClick={() => setExplaining(true)}
                >
                  {grams(resolved.value.totalWater.value)} · {pct(resolved.value.totalWaterPct)}
                </button>
              </dd>
            </dl>
            {resolved.value.totalWater.completeness === 'incomplete' && (
              <IonNote>
                {t('formula.water.incomplete', {
                  ingredients: resolved.value.totalWater.unknownContributors.join(', '),
                })}
              </IonNote>
            )}

            {Object.keys(resolved.value.components).length > 0 && (
              <section className="mt-4">
                <h2 className="font-semibold">{t('formula.components')}</h2>
                {Object.entries(resolved.value.components).map(([id, c]) => (
                  <p key={id}>
                    {id}: {grams(c.flour)} + {grams(c.water)} → {grams(c.mass)}
                  </p>
                ))}
                <h2 className="mt-2 font-semibold">{t('formula.finalMix')}</h2>
                <p>
                  {[
                    ...Object.entries(resolved.value.finalMix.flourByFlour),
                    ['water', resolved.value.finalMix.water] as const,
                    ...Object.entries(resolved.value.finalMix.grams),
                    ...Object.entries(resolved.value.finalMix.componentMasses),
                  ]
                    .map(([id, g]) => `${id} ${grams(g)}`)
                    .join(' · ')}
                </p>
              </section>
            )}
            <WaterExplanation
              resolved={resolved.value}
              open={explaining}
              onClose={() => setExplaining(false)}
            />
          </>
        )}

        {dirty && (
          <div className="mt-6 flex flex-col gap-2">
            <IonNote>{t('formula.unsaved')}</IonNote>
            <IonButton expand="block" onClick={() => void save()}>
              {t('formula.save', { version: base.revision.version + 1 })}
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              onClick={() => {
                drafts.clear(recipeId);
                setDraft(base.revision.formula);
              }}
            >
              {t('formula.discard')}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

interface RowProps {
  readonly label: string;
  readonly pctText?: string;
  readonly pct?: React.ReactNode;
  readonly children: React.ReactNode;
}

const Row = ({ label, pctText, pct, children }: RowProps) => (
  <>
    <span>{label}</span>
    <span className="text-right">{pct ?? pctText}</span>
    <span>{children}</span>
  </>
);
