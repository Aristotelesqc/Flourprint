import { useId, useState } from 'react';
import type {
  ApplianceKind,
  HeatSource,
  OvenMode,
  ProcessStep,
  StepEquipment,
} from '@flourprint/core/domain';
import {
  APPLIANCE_KINDS,
  HEAT_SOURCES,
  OVEN_MODES,
  temperatureContext,
} from '@flourprint/core/domain';
import { Ui } from '../ui/library';
import { TemperatureField } from '../ui/Field';
import { useMessages } from '../i18n/use-messages';

interface Props {
  readonly step: ProcessStep;
  readonly onValidityChange?: (invalid: boolean) => void;
  readonly onChange: (
    equipment: StepEquipment | undefined,
    reportError: (message: string | undefined) => void,
  ) => boolean;
}

export type StepEquipmentFieldsProps = Props;

/**
 * Removes undefined properties structurally.
 * If all properties are undefined, returns undefined.
 * Preserves all existing untouched defined data.
 */
function cleanEquipment(equipment: {
  readonly [K in keyof StepEquipment]?: StepEquipment[K] | undefined;
}): StepEquipment | undefined {
  const cleaned: Record<string, unknown> = {};
  let hasDefined = false;

  for (const [key, value] of Object.entries(equipment)) {
    if (value !== undefined) {
      cleaned[key] = value;
      hasDefined = true;
    }
  }

  return hasDefined ? (cleaned as StepEquipment) : undefined;
}

/**
 * Step equipment & cooking authoring fields (Recipe #169, L71, L89, L129).
 * Renders appliance, oven mode, custom heat sources, and temperature setpoint.
 * Caller handles validation and atomic error reporting through onChange.
 */
export function StepEquipmentFields({ step, onChange, onValidityChange }: Props) {
  const { t } = useMessages();
  const id = useId();

  const [applianceError, setApplianceError] = useState<string | undefined>();
  const [modeError, setModeError] = useState<string | undefined>();
  const [heatError, setHeatError] = useState<string | undefined>();
  const [setpointError, setSetpointError] = useState<string | undefined>();

  const isOven = step.equipment?.appliance === 'oven';

  const applianceOptions = [
    { id: '', label: t('cooking.edit.notSpecified') },
    ...APPLIANCE_KINDS.map((kind) => ({
      id: kind,
      label: kind === 'other' ? t('cooking.edit.otherAppliance') : t(`equipment.appliance.${kind}`),
    })),
  ];

  const modeOptions = [
    { id: '', label: t('cooking.edit.notSpecified') },
    ...OVEN_MODES.map((mode) => ({
      id: mode,
      label: t(`mode.${mode}.name`),
    })),
  ];

  const handleApplianceChange = (value: string) => {
    setApplianceError(undefined);
    setModeError(undefined);
    setHeatError(undefined);
    setSetpointError(undefined);

    const nextAppliance = value === '' ? undefined : (value as ApplianceKind);
    const proposed = cleanEquipment({
      ...step.equipment,
      appliance: nextAppliance,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setApplianceError(reportedError);
    }
  };

  const handleModeChange = (value: string) => {
    setApplianceError(undefined);
    setModeError(undefined);
    setHeatError(undefined);
    setSetpointError(undefined);

    const nextMode = value === '' ? undefined : (value as OvenMode);
    const proposed = cleanEquipment({
      ...step.equipment,
      mode: nextMode,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setModeError(reportedError);
    }
  };

  const handleHeatToggle = (source: HeatSource) => {
    setApplianceError(undefined);
    setModeError(undefined);
    setHeatError(undefined);
    setSetpointError(undefined);

    const currentHeat = step.equipment?.heat ?? [];
    const nextHeat = currentHeat.includes(source)
      ? currentHeat.filter((s) => s !== source)
      : [...currentHeat, source];

    const finalHeat = nextHeat.length > 0 ? nextHeat : undefined;
    const proposed = cleanEquipment({
      ...step.equipment,
      heat: finalHeat,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setHeatError(reportedError);
    }
  };

  const handleSetpointCommit = (setpointC: number | undefined): boolean => {
    setApplianceError(undefined);
    setModeError(undefined);
    setHeatError(undefined);
    setSetpointError(undefined);

    const proposed = cleanEquipment({
      ...step.equipment,
      setpointC,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setSetpointError(reportedError);
    }

    return accepted;
  };

  return (
    <section data-testid="step-equipment-fields" className="space-y-4 pt-2">
      <h3 className="text-sm font-semibold text-on-surface">{t('cooking.edit.title')}</h3>

      <div className="space-y-3">
        <Ui
          component="fp.select"
          label={t('cooking.edit.appliance')}
          value={step.equipment?.appliance ?? ''}
          options={applianceOptions}
          cancelText={t('cooking.edit.cancel')}
          okText={t('cooking.edit.ok')}
          onValueChange={handleApplianceChange}
          {...(applianceError ? { error: applianceError } : {})}
        />

        <div className="space-y-1">
          <Ui
            component="fp.select"
            label={t('cooking.edit.mode')}
            value={step.equipment?.mode ?? ''}
            options={modeOptions}
            cancelText={t('cooking.edit.cancel')}
            okText={t('cooking.edit.ok')}
            disabled={!isOven}
            onValueChange={handleModeChange}
            {...(!isOven ? { description: t('cooking.edit.modeOvenHelp') } : {})}
            {...(modeError ? { error: modeError } : {})}
          />

          {isOven && step.equipment?.mode && (
            <p
              data-testid="mode-help"
              className="text-xs text-muted bg-surface-container rounded-card p-3"
            >
              {t(`mode.${step.equipment.mode}.help`)}
            </p>
          )}
        </div>

        {isOven && step.equipment?.mode === 'custom' && (
          <fieldset
            data-testid="heat-sources-fieldset"
            className="space-y-2 pt-1 border border-outline rounded-card p-3"
          >
            <legend className="text-sm font-medium text-on-surface px-1">
              {t('cooking.edit.heatSources')}
            </legend>
            <p className="text-xs text-muted">{t('cooking.edit.heatHelp')}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {HEAT_SOURCES.map((source) => {
                const inputId = `${id}-heat-source-${source}`;
                const isChecked = step.equipment?.heat?.includes(source) ?? false;
                return (
                  <label
                    key={source}
                    htmlFor={inputId}
                    className="flex min-h-touch items-center gap-2 text-body text-on-surface cursor-pointer"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleHeatToggle(source)}
                      className="h-5 w-5 accent-primary focus-visible:fp-focus-ring"
                    />
                    <span>{t(`cooking.edit.heat.${source}`)}</span>
                  </label>
                );
              })}
            </div>
            {heatError && (
              <p className="text-xs text-error mt-1" role="alert">
                {heatError}
              </p>
            )}
          </fieldset>
        )}

        <div className="space-y-1">
          <span className="block text-sm font-medium text-on-surface">
            {t('cooking.edit.setpoint')}
          </span>
          <TemperatureField
            label={t('cooking.edit.setpoint')}
            value={step.equipment?.setpointC}
            context={temperatureContext(step)}
            onCommit={handleSetpointCommit}
            {...(onValidityChange ? { onValidityChange } : {})}
          />
          {setpointError && (
            <p className="text-xs text-error mt-1" role="alert">
              {setpointError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
