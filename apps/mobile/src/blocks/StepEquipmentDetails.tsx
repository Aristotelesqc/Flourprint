import { useEffect, useEffectEvent, useState } from 'react';
import {
  builtInEquipment,
  temperatureContext,
  type EquipmentEntry,
  type EquipmentRef,
  type ProcessStep,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';
import { useTemperature } from '../i18n/temperature';
import { en, type MessageKey } from '../i18n/messages';
import { Ui } from '../ui/library';

type EntryState =
  | { readonly status: 'none' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly entry: EquipmentEntry }
  | { readonly status: 'missing' }
  | { readonly status: 'error' };

interface KeyedState {
  readonly key: string | undefined;
  readonly status: 'none' | 'loading' | 'ready' | 'missing' | 'error';
  readonly entry?: EquipmentEntry;
}

const isMessageKey = (key: string): key is MessageKey => key in en;

type Translate = ReturnType<typeof useMessages>['t'];

const useEquipmentEntry = (ref: EquipmentRef | undefined): EntryState => {
  const services = useServices();
  const currentKey = ref ? `${ref.id}@${ref.version}` : undefined;

  const [state, setState] = useState<KeyedState>(() => {
    if (!ref) return { key: undefined, status: 'none' };
    const builtIn = builtInEquipment(ref.id, ref.version);
    if (builtIn) return { key: currentKey, status: 'ready', entry: builtIn };
    return { key: currentKey, status: 'loading' };
  });

  const loadOnEquipmentRef = useEffectEvent(() => {
    if (!ref) {
      setState({ key: undefined, status: 'none' });
      return;
    }
    const key = `${ref.id}@${ref.version}`;
    const builtIn = builtInEquipment(ref.id, ref.version);
    if (builtIn) {
      setState({ key, status: 'ready', entry: builtIn });
      return;
    }

    let cancelled = false;
    setState({ key, status: 'loading' });

    services.equipment
      .getEquipment(ref.id, ref.version)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState({ key, status: 'error' });
        } else if (!res.value) {
          setState({ key, status: 'missing' });
        } else {
          setState({ key, status: 'ready', entry: res.value });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ key, status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  });
  useEffect(() => loadOnEquipmentRef(), [ref?.id, ref?.version, services]);

  if (!ref) return { status: 'none' };

  // Key mismatch: synchronously return correct builtin or loading state without stale entry
  if (state.key !== currentKey) {
    const builtIn = builtInEquipment(ref.id, ref.version);
    if (builtIn) return { status: 'ready', entry: builtIn };
    return { status: 'loading' };
  }

  if (state.status === 'ready' && state.entry) {
    return { status: 'ready', entry: state.entry };
  }
  if (state.status === 'loading') return { status: 'loading' };
  if (state.status === 'missing') return { status: 'missing' };
  if (state.status === 'error') return { status: 'error' };
  return { status: 'none' };
};

const entryName = (state: EntryState, t: Translate): string => {
  if (state.status === 'ready') {
    if (state.entry.builtIn) {
      const key = `equipment.${state.entry.id}.name`;
      if (isMessageKey(key)) {
        return t(key);
      }
      return t('equipment.label.missing');
    }
    if (state.entry.name && state.entry.name.trim().length > 0) {
      return state.entry.name;
    }
    return t('equipment.label.unnamed');
  }
  if (state.status === 'loading') return t('equipment.label.loading');
  if (state.status === 'error') return t('equipment.label.error');
  return t('equipment.label.missing');
};

interface Props {
  readonly step: ProcessStep;
}

interface DetailRow {
  readonly label: string;
  readonly value: string;
}

/**
 * Compact, progressive equipment details for a step (#28, #68).
 * Shared by RecipeMethod and ProcessSection.
 * Shows explicit known fields only; missing remains unspecified.
 */
export const StepEquipmentDetails = ({ step }: Props) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);
  const eq = step.equipment;
  const { t, grams, locale } = useMessages();
  const temperature = useTemperature();

  const profileState = useEquipmentEntry(eq?.profile);
  const supportState = useEquipmentEntry(eq?.support?.item);
  const vesselState = useEquipmentEntry(eq?.vessel?.item);

  if (!eq) return null;

  const compactParts: string[] = [];
  const detailRows: DetailRow[] = [];

  // 1. Appliance and profile / nativeMode / mode name
  const applianceKey = eq.appliance ? `equipment.appliance.${eq.appliance}` : undefined;
  const applianceLabel = applianceKey && isMessageKey(applianceKey) ? t(applianceKey) : undefined;
  const profileLabel = eq.profile ? entryName(profileState, t) : undefined;
  const nativeModeLabel = eq.nativeMode ? `“${eq.nativeMode}”` : undefined;
  const modeNameKey = eq.mode ? `mode.${eq.mode}.name` : undefined;
  const modeLabel = modeNameKey && isMessageKey(modeNameKey) ? t(modeNameKey) : undefined;

  const mainApplianceParts = [applianceLabel, profileLabel, nativeModeLabel, modeLabel].filter(
    Boolean,
  ) as string[];

  if (mainApplianceParts.length > 0) {
    compactParts.push(mainApplianceParts.join(' · '));
    detailRows.push({
      label: t('equipment.appliance.other'),
      value: mainApplianceParts.join(' · '),
    });
  }

  // 2. Setpoint and power level (no else-if)
  if (eq.setpointC !== undefined) {
    const tempStr = temperature.format(eq.setpointC, temperatureContext(step));
    const preheatKey = eq.preheated?.appliance
      ? `equipment.preheat.${eq.preheated.appliance}`
      : undefined;
    const preheatStr = preheatKey && isMessageKey(preheatKey) ? ` (${t(preheatKey)})` : '';
    const fullSetpoint = `${tempStr}${preheatStr}`;
    compactParts.push(`${t('equipment.label.setpoint')}: ${fullSetpoint}`);
    detailRows.push({ label: t('equipment.label.setpoint'), value: fullSetpoint });
  } else if (eq.preheated?.appliance !== undefined) {
    const preheatKey = `equipment.preheat.${eq.preheated.appliance}`;
    const preheatVal = isMessageKey(preheatKey) ? t(preheatKey) : eq.preheated.appliance;
    compactParts.push(`${t('equipment.label.preheat')}: ${preheatVal}`);
    detailRows.push({ label: t('equipment.label.preheat'), value: preheatVal });
  }

  if (eq.level !== undefined) {
    const formattedVal = new Intl.NumberFormat(locale).format(eq.level.value);
    let levelStr: string;
    if (eq.level.of !== undefined) {
      const formattedOf = new Intl.NumberFormat(locale).format(eq.level.of);
      levelStr = t('equipment.label.levelOf', { value: formattedVal, of: formattedOf });
    } else {
      levelStr = t('equipment.label.level', { value: formattedVal });
    }
    compactParts.push(levelStr);
    detailRows.push({ label: t('equipment.label.levelLabel'), value: levelStr });
  }

  // 3. Fan
  if (eq.fan !== undefined) {
    const fanKey = `equipment.fan.${eq.fan}`;
    const fanVal = isMessageKey(fanKey) ? t(fanKey) : eq.fan;
    const fanStr = `${t('equipment.label.fan')}: ${fanVal}`;
    compactParts.push(fanStr);
    detailRows.push({ label: t('equipment.label.fan'), value: fanVal });
  }

  // 4. Steam
  if (eq.steam !== undefined) {
    const sourceKey = `equipment.steam.${eq.steam.source}`;
    const sourceVal = isMessageKey(sourceKey) ? t(sourceKey) : eq.steam.source;
    const steamVal = eq.steam.detail ? `${sourceVal} (${eq.steam.detail})` : sourceVal;
    compactParts.push(`${t('equipment.label.steam')}: ${steamVal}`);
    detailRows.push({ label: t('equipment.label.steam'), value: steamVal });
  }

  // 5. Support
  if (eq.support !== undefined || eq.preheated?.support !== undefined) {
    const sName = eq.support ? entryName(supportState, t) : undefined;
    const sPreheatKey = eq.preheated?.support
      ? `equipment.preheat.${eq.preheated.support}`
      : undefined;
    const sPreheatVal =
      sPreheatKey && isMessageKey(sPreheatKey) ? t(sPreheatKey) : eq.preheated?.support;

    let supportVal: string | undefined;
    if (sName && sPreheatVal) {
      supportVal = `${sName} (${sPreheatVal})`;
    } else if (sName) {
      supportVal = sName;
    } else if (sPreheatVal) {
      supportVal = sPreheatVal;
    }

    if (supportVal) {
      compactParts.push(`${t('equipment.label.support')}: ${supportVal}`);
      detailRows.push({ label: t('equipment.label.support'), value: supportVal });
    }
  }

  // 6. Vessel and Cover
  if (eq.vessel !== undefined || eq.preheated?.vessel !== undefined) {
    const vName = eq.vessel ? entryName(vesselState, t) : undefined;
    const coverKey = eq.vessel?.cover ? `equipment.cover.${eq.vessel.cover}` : undefined;
    const coverVal = coverKey && isMessageKey(coverKey) ? t(coverKey) : eq.vessel?.cover;
    const vPreheatKey = eq.preheated?.vessel
      ? `equipment.preheat.${eq.preheated.vessel}`
      : undefined;
    const vPreheatVal =
      vPreheatKey && isMessageKey(vPreheatKey) ? t(vPreheatKey) : eq.preheated?.vessel;

    let vesselVal: string | undefined;
    if (vName) {
      const coverSuffix = coverVal ? ` · ${coverVal}` : '';
      const preheatSuffix = vPreheatVal ? ` (${vPreheatVal})` : '';
      vesselVal = `${vName}${coverSuffix}${preheatSuffix}`;
    } else if (coverVal && vPreheatVal) {
      vesselVal = `${coverVal} (${vPreheatVal})`;
    } else if (coverVal) {
      vesselVal = coverVal;
    } else if (vPreheatVal) {
      vesselVal = vPreheatVal;
    }

    if (vesselVal) {
      compactParts.push(`${t('equipment.label.vessel')}: ${vesselVal}`);
      detailRows.push({ label: t('equipment.label.vessel'), value: vesselVal });
    }
  }

  // 7. Rack
  if (eq.rack !== undefined) {
    compactParts.push(`${t('equipment.label.rack')} ${eq.rack}`);
    detailRows.push({ label: t('equipment.label.rack'), value: eq.rack });
  }

  // 8. Load
  if (eq.load !== undefined) {
    const loadItems: string[] = [];
    if (eq.load.pieces !== undefined) {
      loadItems.push(t('equipment.label.loadPieces', { count: eq.load.pieces }));
    }
    if (eq.load.massG !== undefined) {
      loadItems.push(grams(eq.load.massG));
    }
    if (loadItems.length > 0) {
      const loadVal = loadItems.join(', ');
      compactParts.push(`${t('equipment.label.load')}: ${loadVal}`);
      detailRows.push({ label: t('equipment.label.load'), value: loadVal });
    }
  }

  if (compactParts.length === 0 && detailRows.length === 0 && !eq.mode) {
    return null;
  }

  return (
    <div
      data-testid="step-equipment"
      className="flex min-w-0 flex-col gap-2 text-supporting text-muted"
    >
      {compactParts.length > 0 && <span>{compactParts.slice(0, 2).join(' · ')}</span>}
      {detailRows.length > 0 && (
        <Ui
          component="fp.disclosure"
          label={t('equipment.label.details')}
          expanded={detailsExpanded}
          onExpandedChange={setDetailsExpanded}
        >
          <div className="flex flex-col gap-1 pt-1 pl-2">
            {detailRows.map((row, idx) => (
              <div key={idx} className="flex flex-wrap gap-x-1.5">
                <span className="font-medium text-on-surface">{row.label}:</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        </Ui>
      )}
      {eq.mode && (
        <Ui
          component="fp.disclosure"
          label={modeNameKey && isMessageKey(modeNameKey) ? t(modeNameKey) : eq.mode}
          expanded={helpExpanded}
          onExpandedChange={setHelpExpanded}
        >
          <p className="m-0 pt-0.5 pl-2 text-muted">
            {isMessageKey(`mode.${eq.mode}.help`) ? t(`mode.${eq.mode}.help`) : ''}
          </p>
        </Ui>
      )}
    </div>
  );
};
