import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import type {
  ApplianceKind,
  HeatSource,
  OvenMode,
  ProcessStep,
  SteamSource,
  StepEquipment,
} from '@flourprint/core/domain';
import {
  APPLIANCE_KINDS,
  HEAT_SOURCES,
  OVEN_MODES,
  STEAM_SOURCES,
  temperatureContext,
} from '@flourprint/core/domain';
import { Ui } from '../ui/library';
import { OptionalNumberField, TemperatureField } from '../ui/Field';
import { useMessages } from '../i18n/use-messages';
import { StepApplianceProfile } from './StepApplianceProfile';
import { StepEquipmentItems } from './StepEquipmentItems';

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
 * Renders appliance, oven mode, custom heat sources, temperature setpoint,
 * power level & scale, convection fan, and steam settings.
 * Caller handles validation and atomic error reporting through onChange.
 */
export function StepEquipmentFields({ step, onChange, onValidityChange }: Props) {
  const { t } = useMessages();
  const id = useId();
  const scaleHelpId = `${id}-scale-help`;
  const steamDetailInputId = `${id}-steam-detail`;
  const steamDetailHelpId = `${id}-steam-detail-help`;
  const steamDetailErrorId = `${id}-steam-detail-error`;

  const [applianceError, setApplianceError] = useState<string | undefined>();
  const [modeError, setModeError] = useState<string | undefined>();
  const [heatError, setHeatError] = useState<string | undefined>();
  const [setpointError, setSetpointError] = useState<string | undefined>();
  const [levelValueError, setLevelValueError] = useState<string | undefined>();
  const [levelOfError, setLevelOfError] = useState<string | undefined>();
  const [fanError, setFanError] = useState<string | undefined>();
  const [steamSourceError, setSteamSourceError] = useState<string | undefined>();
  const [steamDetailError, setSteamDetailError] = useState<string | undefined>();

  const [setpointInvalid, setSetpointInvalid] = useState(false);
  const [levelValueInvalid, setLevelValueInvalid] = useState(false);
  const [levelOfInvalid, setLevelOfInvalid] = useState(false);
  const [steamDetailInvalid, setSteamDetailInvalid] = useState(false);
  const [itemsInvalid, setItemsInvalid] = useState(false);
  const [profileInvalid, setProfileInvalid] = useState(false);
  const [itemsCreating, setItemsCreating] = useState(false);
  const [profileCreating, setProfileCreating] = useState(false);

  const currentDetail = step.equipment?.steam?.detail ?? '';
  const [detailDraft, setDetailDraft] = useState<string | null>(null);
  const detailText = detailDraft ?? currentDetail;

  const isOven = step.equipment?.appliance === 'oven';
  const hasLevel = step.equipment?.level?.value !== undefined;
  const hasSteam = step.equipment?.steam !== undefined;

  const handleSetpointValidityChange = useCallback((invalid: boolean) => {
    setSetpointInvalid(invalid);
  }, []);

  const handleLevelValueValidityChange = useCallback((invalid: boolean) => {
    setLevelValueInvalid(invalid);
  }, []);

  const handleLevelOfValidityChange = useCallback((invalid: boolean) => {
    setLevelOfInvalid(invalid);
  }, []);

  const handleProfileCreationOpenChange = useCallback((open: boolean) => {
    setProfileCreating(open);
  }, []);

  const handleItemsCreationOpenChange = useCallback((open: boolean) => {
    setItemsCreating(open);
  }, []);

  const isOverallInvalid =
    setpointInvalid ||
    levelValueInvalid ||
    levelOfInvalid ||
    steamDetailInvalid ||
    (detailDraft !== null && detailDraft !== currentDetail) ||
    itemsInvalid ||
    profileInvalid;

  useEffect(() => {
    onValidityChange?.(isOverallInvalid);
  }, [onValidityChange, isOverallInvalid]);

  useEffect(() => {
    return () => {
      onValidityChange?.(false);
    };
  }, [onValidityChange]);

  const clearAllErrors = () => {
    setApplianceError(undefined);
    setModeError(undefined);
    setHeatError(undefined);
    setFanError(undefined);
    setSteamSourceError(undefined);
  };

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

  const fanOptions = [
    { id: '', label: t('cooking.edit.notSpecified') },
    { id: 'on', label: t('cooking.edit.fan.on') },
    { id: 'off', label: t('cooking.edit.fan.off') },
    { id: 'unknown', label: t('cooking.edit.fan.unknown') },
  ];

  const steamSourceOptions = [
    { id: '', label: t('cooking.edit.notSpecified') },
    ...STEAM_SOURCES.map((source) => ({
      id: source,
      label: t(`cooking.edit.steam.${source}`),
    })),
  ];

  const handleApplianceChange = (value: string) => {
    clearAllErrors();

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
    clearAllErrors();

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
    clearAllErrors();

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
    clearAllErrors();
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

  const handleLevelValueCommit = (value: number | undefined): boolean => {
    clearAllErrors();
    setLevelValueError(undefined);

    const proposedLevel =
      value === undefined
        ? undefined
        : {
            value,
            ...(step.equipment?.level?.of !== undefined ? { of: step.equipment.level.of } : {}),
          };

    const proposed = cleanEquipment({
      ...step.equipment,
      level: proposedLevel,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setLevelValueError(reportedError);
    }

    return accepted;
  };

  const handleLevelOfCommit = (ofValue: number | undefined): boolean => {
    clearAllErrors();
    setLevelOfError(undefined);

    if (step.equipment?.level?.value === undefined) {
      return true;
    }

    const proposedLevel = {
      value: step.equipment.level.value,
      ...(ofValue !== undefined ? { of: ofValue } : {}),
    };

    const proposed = cleanEquipment({
      ...step.equipment,
      level: proposedLevel,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setLevelOfError(reportedError);
    }

    return accepted;
  };

  const handleFanChange = (value: string) => {
    clearAllErrors();

    const nextFan = value === '' ? undefined : (value as 'on' | 'off' | 'unknown');
    const proposed = cleanEquipment({
      ...step.equipment,
      fan: nextFan,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setFanError(reportedError);
    }
  };

  const handleSteamSourceChange = (value: string) => {
    clearAllErrors();

    if (value === '') {
      const proposed = cleanEquipment({
        ...step.equipment,
        steam: undefined,
      });

      let reportedError: string | undefined;
      const accepted = onChange(proposed, (msg) => {
        reportedError = msg;
      });

      if (accepted) {
        setDetailDraft(null);
        setSteamDetailError(undefined);
        setSteamDetailInvalid(false);
      } else if (reportedError) {
        setSteamSourceError(reportedError);
      }
      return;
    }

    const nextSource = value as SteamSource;
    const existingDetail = detailDraft ?? step.equipment?.steam?.detail;
    const proposed = cleanEquipment({
      ...step.equipment,
      steam: {
        source: nextSource,
        ...(existingDetail && existingDetail.trim() !== '' ? { detail: existingDetail } : {}),
      },
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (accepted) {
      setSteamSourceError(undefined);
    } else if (reportedError) {
      setSteamSourceError(reportedError);
    }
  };

  const commitDetail = (text: string) => {
    clearAllErrors();
    setSteamDetailError(undefined);

    if (!step.equipment?.steam) {
      return true;
    }

    const trimmed = text.trim();
    const nextDetail = trimmed === '' ? undefined : text;
    const proposed = cleanEquipment({
      ...step.equipment,
      steam: {
        source: step.equipment.steam.source,
        ...(nextDetail !== undefined ? { detail: nextDetail } : {}),
      },
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (accepted) {
      setDetailDraft(null);
      setSteamDetailError(undefined);
      setSteamDetailInvalid(false);
    } else {
      setDetailDraft(text);
      setSteamDetailError(reportedError);
      setSteamDetailInvalid(true);
    }

    return accepted;
  };

  const handleDetailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDetailDraft(val === currentDetail ? null : val);
  };

  const handleDetailBlur = () => {
    if (detailDraft !== null) {
      commitDetail(detailDraft);
    }
  };

  const handleDetailKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const steamDetailDescribedBy =
    [steamDetailError ? steamDetailErrorId : null, !hasSteam ? steamDetailHelpId : null]
      .filter(Boolean)
      .join(' ') || undefined;

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

        <StepApplianceProfile
          step={step}
          onChange={onChange}
          onValidityChange={setProfileInvalid}
          creationDisabled={itemsCreating}
          onCreationOpenChange={handleProfileCreationOpenChange}
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
            onValidityChange={handleSetpointValidityChange}
          />
          {setpointError && (
            <p className="text-xs text-error mt-1" role="alert">
              {setpointError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="block text-sm font-medium text-on-surface">
              {t('cooking.edit.levelValue')}
            </span>
            <OptionalNumberField
              label={t('cooking.edit.levelValue')}
              value={step.equipment?.level?.value}
              onCommit={handleLevelValueCommit}
              domainInvalidText={levelValueError}
              onValidityChange={handleLevelValueValidityChange}
            />
          </div>

          <div className="space-y-1">
            <span className="block text-sm font-medium text-on-surface">
              {t('cooking.edit.levelOf')}
            </span>
            <OptionalNumberField
              label={t('cooking.edit.levelOf')}
              value={step.equipment?.level?.of}
              disabled={!hasLevel}
              onCommit={handleLevelOfCommit}
              domainInvalidText={levelOfError}
              onValidityChange={handleLevelOfValidityChange}
              describedBy={!hasLevel ? scaleHelpId : undefined}
            />
            {!hasLevel && (
              <p id={scaleHelpId} className="text-xs text-muted">
                {t('cooking.edit.scaleHelp')}
              </p>
            )}
          </div>
        </div>

        <Ui
          component="fp.select"
          label={t('cooking.edit.fan')}
          value={step.equipment?.fan ?? ''}
          options={fanOptions}
          cancelText={t('cooking.edit.cancel')}
          okText={t('cooking.edit.ok')}
          onValueChange={handleFanChange}
          {...(fanError ? { error: fanError } : {})}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Ui
            component="fp.select"
            label={t('cooking.edit.steamSource')}
            value={step.equipment?.steam?.source ?? ''}
            options={steamSourceOptions}
            cancelText={t('cooking.edit.cancel')}
            okText={t('cooking.edit.ok')}
            onValueChange={handleSteamSourceChange}
            {...(steamSourceError ? { error: steamSourceError } : {})}
          />

          <div className="space-y-1">
            <label
              htmlFor={steamDetailInputId}
              className="block text-sm font-medium text-on-surface"
            >
              {t('cooking.edit.steamDetail')}
            </label>
            <input
              id={steamDetailInputId}
              type="text"
              value={detailText}
              disabled={!hasSteam}
              placeholder={t('cooking.edit.steamDetailPlaceholder')}
              aria-invalid={steamDetailError ? 'true' : undefined}
              aria-describedby={steamDetailDescribedBy}
              onChange={handleDetailChange}
              onBlur={handleDetailBlur}
              onKeyDown={handleDetailKeyDown}
              className={`w-full min-h-12 bg-field-background border rounded-card px-3 py-2 text-body text-on-surface focus-visible:fp-focus-ring focus-visible:outline-none ${
                steamDetailError
                  ? 'border-error'
                  : 'border-field-outline focus-visible:border-primary'
              } ${!hasSteam ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {!hasSteam && (
              <p id={steamDetailHelpId} className="text-xs text-muted">
                {t('cooking.edit.steamDetailHelp')}
              </p>
            )}
            {steamDetailError && (
              <p id={steamDetailErrorId} role="alert" className="text-xs text-error mt-1">
                {steamDetailError}
              </p>
            )}
          </div>
        </div>
        <StepEquipmentItems
          step={step}
          onChange={onChange}
          onValidityChange={setItemsInvalid}
          creationDisabled={profileCreating}
          onCreationOpenChange={handleItemsCreationOpenChange}
        />
      </div>
    </section>
  );
}
