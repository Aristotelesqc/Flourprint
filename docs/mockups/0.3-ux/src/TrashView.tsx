import React from 'react';
import { t, type Locale } from './messages';
import { Button, Surface } from './ui';
import { copyT } from './app-copy';
import { recipeName, type Prototype, type Recipe } from './model';

export interface TrashViewProps {
  readonly store: Prototype;
  readonly locale: Locale;
  readonly onBack: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ store, locale, onBack }) => {
  const trashedRecipes = store.state.recipes.filter((r) => r.trashed);

  const handleRestore = (id: string) => {
    store.setState((s) => ({
      ...s,
      recipes: s.recipes.map((r) => (r.id === id ? { ...r, trashed: false } : r)),
    }));
  };

  return (
    <div className="stack" data-testid="trash-view">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--fp-space-2)' }}>
        <Button variant="secondary" onClick={onBack}>
          {t(locale, 'back')}
        </Button>
        <h2 style={{ margin: 0 }}>{copyT(locale, 'trashTitle')}</h2>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        {copyT(locale, 'trashDescription')}
      </p>

      {trashedRecipes.length === 0 ? (
        <p className="muted">{copyT(locale, 'trashEmpty')}</p>
      ) : (
        <div className="stack" style={{ display: 'grid', gap: 'var(--fp-space-2)' }}>
          {trashedRecipes.map((r: Recipe) => (
            <Surface key={r.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--fp-space-2)',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--type-label)' }}>
                    {recipeName(r, locale)}
                  </h3>
                  <small className="muted">v{r.version}</small>
                </div>
                <Button variant="secondary" onClick={() => handleRestore(r.id)}>
                  {copyT(locale, 'restoreAction')}
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
};
