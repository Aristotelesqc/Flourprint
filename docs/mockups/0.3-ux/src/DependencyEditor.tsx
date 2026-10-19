import { useState } from 'react';
import { validateProcess, type Process, type ProcessStep } from '@flourprint/core/domain';
import { CompactDialog, Button } from './ui';
import { t, type Locale } from './messages';
import { stepCopy } from './steps-copy';

export interface DependencyEditorProps {
  step: ProcessStep;
  process: Process;
  locale: Locale;
  titleOf: (step: ProcessStep, locale: Locale) => string;
  onClose: () => void;
  onApply: (dependsOn: string[]) => boolean;
}

export const DependencyEditor = ({
  step,
  process,
  locale,
  titleOf,
  onClose,
  onApply,
}: DependencyEditorProps) => {
  const [selected, setSelected] = useState<string[]>(() => [...step.dependsOn]);
  const [candidateToAdd, setCandidateToAdd] = useState<string>('');
  const [error, setError] = useState(false);

  // Available predecessors: not current step, not already selected, not descendant,
  // and adding candidate maintains a valid DAG
  const availablePredecessors = process.steps.filter((candidate) => {
    if (candidate.id === step.id) return false;
    if (selected.includes(candidate.id)) return false;
    const testProcess: Process = {
      ...process,
      steps: process.steps.map((s) =>
        s.id === step.id ? { ...s, dependsOn: [...selected, candidate.id] } : s,
      ),
    };
    return validateProcess(testProcess).ok;
  });

  const handleRemove = (id: string) => {
    setSelected((prev) => prev.filter((d) => d !== id));
    setError(false);
  };

  const handleAdd = () => {
    if (!candidateToAdd) return;
    setSelected((prev) => [...prev, candidateToAdd]);
    setCandidateToAdd('');
    setError(false);
  };

  const handleApply = () => {
    const candidateProcess: Process = {
      ...process,
      steps: process.steps.map((s) => (s.id === step.id ? { ...s, dependsOn: selected } : s)),
    };
    const valid = validateProcess(candidateProcess);
    if (!valid.ok) {
      setError(true);
      return;
    }
    if (onApply(selected)) {
      onClose();
    } else {
      setError(true);
    }
  };

  const colonSeparator = locale === 'fr' ? ' : ' : ': ';

  return (
    <CompactDialog
      open
      onClose={onClose}
      title={`${stepCopy(locale, 'dependencyEditorTitle')}${colonSeparator}${titleOf(step, locale)}`}
      closeLabel={t(locale, 'close')}
      footer={
        <div className="row" style={{ gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="quiet" onClick={onClose}>
            {t(locale, 'cancel')}
          </Button>
          <Button variant="primary" onClick={handleApply}>
            {stepCopy(locale, 'applyDependencies')}
          </Button>
        </div>
      }
    >
      <div className="stack" style={{ gap: '1rem' }}>
        <p className="muted" style={{ margin: 0 }}>
          {stepCopy(locale, 'dependencyEditorHelp')}
        </p>

        {error && (
          <p className="warning" role="alert" style={{ color: 'var(--color-danger, #dc2626)' }}>
            {t(locale, 'invalidPlan')}
          </p>
        )}

        <div className="stack" style={{ gap: '0.5rem' }}>
          <span className="field-label" style={{ fontWeight: 600 }}>
            {stepCopy(locale, 'currentDependenciesLabel')}
          </span>
          {selected.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              {stepCopy(locale, 'noDirectDependencies')}
            </p>
          ) : (
            <div className="stack" style={{ gap: '0.5rem' }}>
              {selected.map((depId) => {
                const depStep = process.steps.find((s) => s.id === depId);
                const depTitle = depStep ? titleOf(depStep, locale) : depId;
                return (
                  <div
                    key={depId}
                    className="row"
                    style={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.375rem 0.5rem',
                      borderRadius: 'var(--radius-sm, 4px)',
                      background: 'var(--color-surface-container, rgba(0,0,0,0.04))',
                    }}
                  >
                    <span>{depTitle}</span>
                    <Button variant="quiet" onClick={() => handleRemove(depId)}>
                      {t(locale, 'remove')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: '0.5rem' }}>
          <label
            className="field-label"
            htmlFor="add-predecessor-select"
            style={{ fontWeight: 600 }}
          >
            {stepCopy(locale, 'addPredecessorLabel')}
          </label>
          <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <select
              id="add-predecessor-select"
              value={candidateToAdd}
              disabled={availablePredecessors.length === 0}
              onChange={(e) => setCandidateToAdd(e.target.value)}
              style={{ flex: 1, minHeight: '2.5rem' }}
            >
              <option value="">
                {availablePredecessors.length === 0
                  ? stepCopy(locale, 'noAdditionalDependencies')
                  : stepCopy(locale, 'choosePredecessorPlaceholder')}
              </option>
              {availablePredecessors.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {titleOf(candidate, locale)}
                </option>
              ))}
            </select>
            <Button variant="quiet" disabled={!candidateToAdd} onClick={handleAdd}>
              {stepCopy(locale, 'addPredecessorAction')}
            </Button>
          </div>
        </div>
      </div>
    </CompactDialog>
  );
};
