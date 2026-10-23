import React, { useState } from 'react';
import {
  BUILT_IN_COMPONENT_DEFAULTS,
  COMPONENT_PRESETS,
  defaultHydrationForRatio,
  validateComponentDefault,
  type ComponentDefault,
  type ComponentDefaults,
  type ComponentPreset,
} from '@flourprint/core/domain';
import { Button, CompactDialog, NumberField, Surface } from './ui';
import type { Locale } from './messages';
import { defaultsCopy, extractFormulaErrorReason, formatEngineReason } from './defaults-copy';
import {
  defaultRatioForComponentDefault,
  loadComponentDefaults,
  resetComponentDefaults,
  saveComponentDefaults,
} from './component-defaults';

export interface ComponentDefaultsSettingsProps {
  readonly locale: Locale;
}

export function ComponentDefaultsSettings({
  locale,
}: ComponentDefaultsSettingsProps): React.JSX.Element {
  const [defaults, setDefaults] = useState<ComponentDefaults>(() => loadComponentDefaults());
  const [resetEpochs, setResetEpochs] = useState<Record<string, number>>({});
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<
    Record<ComponentPreset, { flourPct?: string; hydrationPct?: string; ratio?: string }>
  >({
    poolish: {},
    tangzhong: {},
    yudane: {},
  });
  const [confirmingReset, setConfirmingReset] = useState(false);

  const setPresetError = (
    preset: ComponentPreset,
    field: 'flourPct' | 'hydrationPct' | 'ratio',
    reason?: string,
  ) => {
    setFieldErrors((prev) => ({
      ...prev,
      [preset]: {
        ...prev[preset],
        [field]: reason,
      },
    }));
  };

  const clearPresetErrors = (
    preset: ComponentPreset,
    ...fields: ('flourPct' | 'hydrationPct' | 'ratio')[]
  ) => {
    setFieldErrors((prev) => ({
      ...prev,
      [preset]: Object.fromEntries(
        Object.entries(prev[preset]).filter(
          ([key]) => !fields.includes(key as 'flourPct' | 'hydrationPct' | 'ratio'),
        ),
      ),
    }));
  };

  const handleCommitFlour = (preset: ComponentPreset, value: number): boolean => {
    const candidate: ComponentDefault = {
      flourPct: value,
      hydrationPct: defaults[preset].hydrationPct,
    };
    const valid = validateComponentDefault(preset, candidate);
    if (!valid.ok) {
      setPresetError(preset, 'flourPct', extractFormulaErrorReason(valid.error));
      return false;
    }
    clearPresetErrors(preset, 'flourPct');
    const next: ComponentDefaults = { ...defaults, [preset]: valid.value };
    setDefaults(next);
    saveComponentDefaults(next);
    return true;
  };

  const handleCommitHydration = (preset: ComponentPreset, value: number): boolean => {
    const candidate: ComponentDefault = {
      flourPct: defaults[preset].flourPct,
      hydrationPct: value,
    };
    const valid = validateComponentDefault(preset, candidate);
    if (!valid.ok) {
      setPresetError(preset, 'hydrationPct', extractFormulaErrorReason(valid.error));
      return false;
    }
    // Only clear hydration error; do not clear sibling ratio error if invalid (L62)
    clearPresetErrors(preset, 'hydrationPct');
    const next: ComponentDefaults = { ...defaults, [preset]: valid.value };
    setDefaults(next);
    saveComponentDefaults(next);

    // Synchronize sibling ratio only if the sibling does not have an invalid draft or engine error (L62)
    if (!invalidFields[`${preset}:ratio`] && !fieldErrors[preset]?.ratio) {
      setResetEpochs((prev) => ({
        ...prev,
        [`${preset}:ratio`]: (prev[`${preset}:ratio`] ?? 0) + 1,
      }));
    }
    return true;
  };

  const handleCommitRatio = (preset: ComponentPreset, parts: number): boolean => {
    const hydResult = defaultHydrationForRatio(parts);
    if (!hydResult.ok) {
      setPresetError(preset, 'ratio', extractFormulaErrorReason(hydResult.error));
      return false;
    }
    const candidate: ComponentDefault = {
      flourPct: defaults[preset].flourPct,
      hydrationPct: hydResult.value,
    };
    const valid = validateComponentDefault(preset, candidate);
    if (!valid.ok) {
      setPresetError(preset, 'ratio', extractFormulaErrorReason(valid.error));
      return false;
    }
    // Only clear ratio error; do not clear sibling hydration error if invalid (L62)
    clearPresetErrors(preset, 'ratio');
    const next: ComponentDefaults = { ...defaults, [preset]: valid.value };
    setDefaults(next);
    saveComponentDefaults(next);

    // Synchronize sibling hydration only if the sibling does not have an invalid draft or engine error (L62)
    if (!invalidFields[`${preset}:hydration`] && !fieldErrors[preset]?.hydrationPct) {
      setResetEpochs((prev) => ({
        ...prev,
        [`${preset}:hydration`]: (prev[`${preset}:hydration`] ?? 0) + 1,
      }));
    }
    return true;
  };

  const isDirty = () => {
    if (Object.values(invalidFields).some(Boolean)) return true;
    const hasErrors = (['poolish', 'tangzhong', 'yudane'] as const).some((p) => {
      const errs = fieldErrors[p];
      return Boolean(errs.flourPct || errs.hydrationPct || errs.ratio);
    });
    if (hasErrors) return true;
    return (['poolish', 'tangzhong', 'yudane'] as const).some((p) => {
      const current = defaults[p];
      const standard = BUILT_IN_COMPONENT_DEFAULTS[p];
      return (
        current.flourPct !== standard.flourPct || current.hydrationPct !== standard.hydrationPct
      );
    });
  };

  const executeReset = () => {
    const fresh = resetComponentDefaults();
    setDefaults(fresh);
    setFieldErrors({ poolish: {}, tangzhong: {}, yudane: {} });
    setInvalidFields({});
    setResetEpochs((prev) => {
      const next: Record<string, number> = {};
      for (const p of COMPONENT_PRESETS) {
        next[`${p}:flour`] = (prev[`${p}:flour`] ?? 0) + 1;
        next[`${p}:ratio`] = (prev[`${p}:ratio`] ?? 0) + 1;
        next[`${p}:hydration`] = (prev[`${p}:hydration`] ?? 0) + 1;
      }
      return next;
    });
    setConfirmingReset(false);
  };

  const handleResetClick = () => {
    if (isDirty()) {
      setConfirmingReset(true);
    } else {
      executeReset();
    }
  };

  return (
    <div className="stack" data-testid="component-defaults-settings">
      <div className="detail-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h2>{defaultsCopy(locale, 'settingsTitle')}</h2>
          <p className="muted" style={{ margin: '0.25rem 0' }}>
            {defaultsCopy(locale, 'settingsDescription')}
          </p>
        </div>
      </div>

      {COMPONENT_PRESETS.map((preset) => {
        const def = defaults[preset];
        const isScald = preset === 'tangzhong' || preset === 'yudane';
        const ratioValue = defaultRatioForComponentDefault(preset, def);
        const errs = fieldErrors[preset];

        return (
          <Surface
            key={preset}
            variant="container"
            className="stack"
            componentId={`defaults-${preset}`}
          >
            <div className="detail-row" style={{ justifyContent: 'space-between' }}>
              <h3>{defaultsCopy(locale, preset)}</h3>
            </div>

            <NumberField
              key={`flour-${preset}`}
              value={def.flourPct}
              label={defaultsCopy(locale, 'flourShare')}
              unit="%"
              locale={locale}
              resetKey={resetEpochs[`${preset}:flour`] ?? 0}
              displayDigits={2}
              onValidityChange={(invalid) =>
                setInvalidFields((prev) =>
                  prev[`${preset}:flour`] === invalid
                    ? prev
                    : { ...prev, [`${preset}:flour`]: invalid },
                )
              }
              onCommit={(val) => handleCommitFlour(preset, val)}
              errorMessage={
                errs.flourPct
                  ? formatEngineReason(locale, errs.flourPct, preset)
                  : defaultsCopy(locale, 'invalidNumber')
              }
              dataTestId={`defaults-flour-${preset}`}
            />

            {isScald ? (
              <div
                className="detail-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  alignItems: 'start',
                }}
              >
                <div>
                  <NumberField
                    key={`ratio-${preset}`}
                    value={ratioValue}
                    label={defaultsCopy(locale, 'ratio')}
                    unit={defaultsCopy(locale, 'ratioPrefix')}
                    unitPosition="prefix"
                    locale={locale}
                    resetKey={resetEpochs[`${preset}:ratio`] ?? 0}
                    displayDigits={2}
                    onValidityChange={(invalid) =>
                      setInvalidFields((prev) =>
                        prev[`${preset}:ratio`] === invalid
                          ? prev
                          : { ...prev, [`${preset}:ratio`]: invalid },
                      )
                    }
                    onCommit={(val) => handleCommitRatio(preset, val)}
                    errorMessage={
                      errs.ratio
                        ? formatEngineReason(locale, errs.ratio, preset)
                        : defaultsCopy(locale, 'invalidNumber')
                    }
                    dataTestId={`defaults-ratio-${preset}`}
                  />
                </div>

                <div>
                  <NumberField
                    key={`hydration-${preset}`}
                    value={def.hydrationPct}
                    label={defaultsCopy(locale, 'hydration')}
                    unit="%"
                    locale={locale}
                    resetKey={resetEpochs[`${preset}:hydration`] ?? 0}
                    displayDigits={0}
                    onValidityChange={(invalid) =>
                      setInvalidFields((prev) =>
                        prev[`${preset}:hydration`] === invalid
                          ? prev
                          : { ...prev, [`${preset}:hydration`]: invalid },
                      )
                    }
                    onCommit={(val) => handleCommitHydration(preset, val)}
                    errorMessage={
                      errs.hydrationPct
                        ? formatEngineReason(locale, errs.hydrationPct, preset)
                        : defaultsCopy(locale, 'invalidNumber')
                    }
                    dataTestId={`defaults-hydration-${preset}`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <NumberField
                  key={`hydration-${preset}`}
                  value={def.hydrationPct}
                  label={defaultsCopy(locale, 'hydration')}
                  unit="%"
                  locale={locale}
                  resetKey={resetEpochs[`${preset}:hydration`] ?? 0}
                  displayDigits={0}
                  onValidityChange={(invalid) =>
                    setInvalidFields((prev) =>
                      prev[`${preset}:hydration`] === invalid
                        ? prev
                        : { ...prev, [`${preset}:hydration`]: invalid },
                    )
                  }
                  onCommit={(val) => handleCommitHydration(preset, val)}
                  errorMessage={
                    errs.hydrationPct
                      ? formatEngineReason(locale, errs.hydrationPct, preset)
                      : defaultsCopy(locale, 'invalidNumber')
                  }
                  dataTestId={`defaults-hydration-${preset}`}
                />
              </div>
            )}
          </Surface>
        );
      })}

      <div className="actions" style={{ marginTop: '0.5rem' }}>
        <Button variant="quiet" onClick={handleResetClick}>
          {defaultsCopy(locale, 'resetDefaults')}
        </Button>
      </div>

      {confirmingReset && (
        <CompactDialog
          open
          onClose={() => setConfirmingReset(false)}
          title={defaultsCopy(locale, 'resetConfirmTitle')}
          closeLabel={defaultsCopy(locale, 'cancelAction')}
          footer={
            <div
              className="actions"
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
            >
              <Button onClick={() => setConfirmingReset(false)}>
                {defaultsCopy(locale, 'cancelAction')}
              </Button>
              <Button variant="danger" onClick={executeReset}>
                {defaultsCopy(locale, 'confirmAction')}
              </Button>
            </div>
          }
        >
          <p>{defaultsCopy(locale, 'resetConfirmMessage')}</p>
        </CompactDialog>
      )}
    </div>
  );
}

export default ComponentDefaultsSettings;
