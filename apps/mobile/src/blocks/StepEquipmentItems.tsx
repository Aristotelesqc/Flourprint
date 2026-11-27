import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type {
  Cover,
  EquipmentEntry,
  EquipmentKind,
  EquipmentRef,
  Preheat,
  ProcessStep,
  StepEquipment,
} from '@flourprint/core/domain';
import { builtInEquipment, BUILT_IN_EQUIPMENT, COVERS, PREHEATS } from '@flourprint/core/domain';
import { equipmentCatalog } from '@flourprint/core/application';
import { Ui } from '../ui/library';
import { useServices } from '../services/services';
import { useMessages } from '../i18n/use-messages';
import { en, type MessageKey } from '../i18n/messages';
import { PersonalEquipmentCreate } from './PersonalEquipmentCreate';

interface Props {
  readonly step: ProcessStep;
  readonly onChange: (
    equipment: StepEquipment | undefined,
    reportError: (message: string | undefined) => void,
  ) => boolean;
  readonly onValidityChange?: (invalid: boolean) => void;
  readonly creationDisabled?: boolean;
  readonly onCreationOpenChange?: (open: boolean) => void;
}

export type StepEquipmentItemsProps = Props;

export type EntryResolution =
  | { readonly status: 'none' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly entry: EquipmentEntry }
  | { readonly status: 'missing' }
  | { readonly status: 'error' };

interface KeyedResolution {
  readonly key: string | undefined;
  readonly status: 'none' | 'loading' | 'ready' | 'missing' | 'error';
  readonly entry?: EquipmentEntry;
}

const isMessageKey = (key: string): key is MessageKey => key in en;

export type Translate = ReturnType<typeof useMessages>['t'];

export function formatEntryName(entry: EquipmentEntry, t: Translate): string {
  if (entry.builtIn) {
    const key = `equipment.${entry.id}.name`;
    if (isMessageKey(key)) {
      return t(key);
    }
    return t('equipment.label.missing');
  }
  if (entry.name && entry.name.trim().length > 0) {
    return entry.name;
  }
  return t('equipment.label.unnamed');
}

/**
 * Loads an equipment reference (built-in or personal registry entry) with cancellation.
 * If the resolved entry does not match the expected kind, it is treated as unresolved ('missing').
 */
export function useEquipmentRef(
  ref: EquipmentRef | undefined,
  expectedKind: EquipmentKind,
): EntryResolution {
  const services = useServices();
  const currentKey = ref ? `${ref.id}@${ref.version}` : undefined;

  const [state, setState] = useState<KeyedResolution>(() => {
    if (!ref) return { key: undefined, status: 'none' };
    const builtIn = builtInEquipment(ref.id, ref.version);
    if (builtIn) {
      if (builtIn.kind === expectedKind) {
        return { key: currentKey, status: 'ready', entry: builtIn };
      }
      return { key: currentKey, status: 'missing' };
    }
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
      if (builtIn.kind === expectedKind) {
        setState({ key, status: 'ready', entry: builtIn });
      } else {
        setState({ key, status: 'missing' });
      }
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
        } else if (!res.value || res.value.kind !== expectedKind) {
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

  useEffect(() => loadOnEquipmentRef(), [ref?.id, ref?.version, expectedKind, services]);

  if (!ref) return { status: 'none' };

  if (state.key !== currentKey) {
    const builtIn = builtInEquipment(ref.id, ref.version);
    if (builtIn) {
      return builtIn.kind === expectedKind
        ? { status: 'ready', entry: builtIn }
        : { status: 'missing' };
    }
    return { status: 'loading' };
  }

  if (state.status === 'ready' && state.entry) {
    return { status: 'ready', entry: state.entry };
  }
  if (state.status === 'loading') return { status: 'loading' };
  if (state.status === 'missing') return { status: 'missing' };
  if (state.status === 'error') return { status: 'error' };
  return { status: 'none' };
}

interface CatalogState {
  readonly status: 'loading' | 'ready' | 'error';
  readonly entries: readonly EquipmentEntry[];
}

export function cleanEquipment(equipment: {
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

function cleanPreheated(
  preheated:
    | {
        readonly appliance?: Preheat | undefined;
        readonly support?: Preheat | undefined;
        readonly vessel?: Preheat | undefined;
      }
    | undefined,
): StepEquipment['preheated'] {
  if (!preheated) return undefined;
  const { appliance, support, vessel } = preheated;
  if (appliance === undefined && support === undefined && vessel === undefined) {
    return undefined;
  }
  return {
    ...(appliance !== undefined ? { appliance } : {}),
    ...(support !== undefined ? { support } : {}),
    ...(vessel !== undefined ? { vessel } : {}),
  };
}

/**
 * Step support, vessel, cover, and preheat facts (Recipe #169, L71, L89, L115, L129, L143).
 */
export function StepEquipmentItems({
  step,
  onChange,
  onValidityChange,
  creationDisabled,
  onCreationOpenChange,
}: Props) {
  const { t } = useMessages();
  const services = useServices();

  const [catalogState, setCatalogState] = useState<CatalogState>({
    status: 'loading',
    entries: BUILT_IN_EQUIPMENT,
  });
  const [createKind, setCreateKind] = useState<'support' | 'vessel' | null>(null);
  const [creationStatus, setCreationStatus] = useState<{
    readonly kind: EquipmentKind;
    readonly message: string;
  }>();
  const [createInvalid, setCreateInvalid] = useState(false);

  const supportButtonRef = useRef<HTMLButtonElement | null>(null);
  const vesselButtonRef = useRef<HTMLButtonElement | null>(null);
  const initiatingKindRef = useRef<'support' | 'vessel' | null>(null);

  const handleCreateValidityChange = useCallback((blocked: boolean) => {
    setCreateInvalid(blocked);
  }, []);

  useEffect(() => {
    onValidityChange?.(createInvalid);
  }, [onValidityChange, createInvalid]);

  useEffect(() => {
    return () => {
      onValidityChange?.(false);
    };
  }, [onValidityChange]);

  useEffect(() => {
    return () => {
      onCreationOpenChange?.(false);
    };
  }, [onCreationOpenChange]);

  useEffect(() => {
    if (createKind !== null) return;
    const kind = initiatingKindRef.current;
    initiatingKindRef.current = null;
    if (kind === 'support') supportButtonRef.current?.focus();
    else if (kind === 'vessel') vesselButtonRef.current?.focus();
  }, [createKind]);

  const handleOpenCreateSupport = () => {
    setCreationStatus(undefined);
    initiatingKindRef.current = 'support';
    setCreateKind('support');
    onCreationOpenChange?.(true);
  };

  const handleOpenCreateVessel = () => {
    setCreationStatus(undefined);
    initiatingKindRef.current = 'vessel';
    setCreateKind('vessel');
    onCreationOpenChange?.(true);
  };

  const handleCancelCreate = () => {
    setCreateKind(null);
    setCreateInvalid(false);
    onCreationOpenChange?.(false);
  };

  const handleCreated = (entry: EquipmentEntry) => {
    setCatalogState((prev) => ({
      ...prev,
      entries: [...prev.entries, entry],
    }));
    setCreationStatus({
      kind: entry.kind,
      message: t('equipment.create.createdStatus', {
        name: formatEntryName(entry, t),
      }),
    });
    setCreateKind(null);
    setCreateInvalid(false);
    onCreationOpenChange?.(false);
  };

  const loadCatalog = useEffectEvent(() => {
    let cancelled = false;
    equipmentCatalog(services.equipment)
      .then((entries) => {
        if (cancelled) return;
        setCatalogState({ status: 'ready', entries });
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogState({ status: 'error', entries: BUILT_IN_EQUIPMENT });
        }
      });

    return () => {
      cancelled = true;
    };
  });

  useEffect(() => loadCatalog(), [services]);

  const supportRef = step.equipment?.support?.item;
  const vesselRef = step.equipment?.vessel?.item;

  const resolvedSupport = useEquipmentRef(supportRef, 'support');
  const resolvedVessel = useEquipmentRef(vesselRef, 'vessel');

  const [supportError, setSupportError] = useState<string | undefined>();
  const [vesselError, setVesselError] = useState<string | undefined>();
  const [coverError, setCoverError] = useState<string | undefined>();
  const [preheatApplianceError, setPreheatApplianceError] = useState<string | undefined>();
  const [preheatSupportError, setPreheatSupportError] = useState<string | undefined>();
  const [preheatVesselError, setPreheatVesselError] = useState<string | undefined>();

  const { supportOptions, supportMap } = useMemo(() => {
    const options: { id: string; label: string }[] = [
      { id: '', label: t('cooking.edit.notSpecified') },
    ];
    const map = new Map<string, EquipmentRef>();

    for (const entry of catalogState.entries) {
      if (entry.kind === 'support' && !entry.archived) {
        const key = `${entry.id}@${entry.version}`;
        options.push({ id: key, label: formatEntryName(entry, t) });
        map.set(key, { id: entry.id, version: entry.version });
      }
    }

    if (supportRef) {
      const selectedKey = `${supportRef.id}@${supportRef.version}`;
      if (!map.has(selectedKey)) {
        let label: string;
        if (resolvedSupport.status === 'ready') {
          const baseName = formatEntryName(resolvedSupport.entry, t);
          label = t('cooking.edit.itemInRecipe', { name: baseName });
        } else if (resolvedSupport.status === 'loading') {
          label = t('equipment.label.loading');
        } else if (resolvedSupport.status === 'error') {
          label = t('equipment.label.error');
        } else {
          label = t('equipment.label.missing');
        }
        options.push({ id: selectedKey, label });
        map.set(selectedKey, supportRef);
      }
    }

    return { supportOptions: options, supportMap: map };
  }, [catalogState.entries, supportRef, resolvedSupport, t]);

  const { vesselOptions, vesselMap } = useMemo(() => {
    const options: { id: string; label: string }[] = [
      { id: '', label: t('cooking.edit.notSpecified') },
    ];
    const map = new Map<string, EquipmentRef>();

    for (const entry of catalogState.entries) {
      if (entry.kind === 'vessel' && !entry.archived) {
        const key = `${entry.id}@${entry.version}`;
        options.push({ id: key, label: formatEntryName(entry, t) });
        map.set(key, { id: entry.id, version: entry.version });
      }
    }

    if (vesselRef) {
      const selectedKey = `${vesselRef.id}@${vesselRef.version}`;
      if (!map.has(selectedKey)) {
        let label: string;
        if (resolvedVessel.status === 'ready') {
          const baseName = formatEntryName(resolvedVessel.entry, t);
          label = t('cooking.edit.itemInRecipe', { name: baseName });
        } else if (resolvedVessel.status === 'loading') {
          label = t('equipment.label.loading');
        } else if (resolvedVessel.status === 'error') {
          label = t('equipment.label.error');
        } else {
          label = t('equipment.label.missing');
        }
        options.push({ id: selectedKey, label });
        map.set(selectedKey, vesselRef);
      }
    }

    return { vesselOptions: options, vesselMap: map };
  }, [catalogState.entries, vesselRef, resolvedVessel, t]);

  const hasVessel = step.equipment?.vessel !== undefined;

  const coverOptions = useMemo(() => {
    if (!hasVessel) {
      return [{ id: '', label: t('cooking.edit.notSpecified') }];
    }
    return COVERS.map((cover) => ({
      id: cover,
      label: t(`cooking.edit.cover.${cover}`),
    }));
  }, [hasVessel, t]);

  const preheatOptions = useMemo(() => {
    return [
      { id: '', label: t('cooking.edit.notSpecified') },
      ...PREHEATS.map((preheat) => ({
        id: preheat,
        label: t(`cooking.edit.preheat.${preheat}`),
      })),
    ];
  }, [t]);

  const handleSupportChange = (value: string) => {
    setSupportError(undefined);

    let nextSupport: { readonly item: EquipmentRef } | undefined;
    if (value !== '') {
      const targetRef = supportMap.get(value);
      if (!targetRef) return;
      nextSupport = { item: targetRef };
    }

    const proposed = cleanEquipment({
      ...step.equipment,
      support: nextSupport,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setSupportError(reportedError);
    }
  };

  const handleVesselChange = (value: string) => {
    setVesselError(undefined);
    setCoverError(undefined);

    let nextVessel: { readonly item: EquipmentRef; readonly cover: Cover } | undefined;
    if (value !== '') {
      const targetRef = vesselMap.get(value);
      if (!targetRef) return;
      const cover: Cover = step.equipment?.vessel?.cover ?? 'unknown';
      nextVessel = { item: targetRef, cover };
    }

    const proposed = cleanEquipment({
      ...step.equipment,
      vessel: nextVessel,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setVesselError(reportedError);
    }
  };

  const handleCoverChange = (value: string) => {
    setCoverError(undefined);

    if (!step.equipment?.vessel) {
      return;
    }

    const nextCover = value as Cover;
    const proposed = cleanEquipment({
      ...step.equipment,
      vessel: {
        ...step.equipment.vessel,
        cover: nextCover,
      },
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setCoverError(reportedError);
    }
  };

  const handlePreheatApplianceChange = (value: string) => {
    setPreheatApplianceError(undefined);

    const nextPreheat = value === '' ? undefined : (value as Preheat);
    const nextPreheated = cleanPreheated({
      ...step.equipment?.preheated,
      appliance: nextPreheat,
    });

    const proposed = cleanEquipment({
      ...step.equipment,
      preheated: nextPreheated,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setPreheatApplianceError(reportedError);
    }
  };

  const handlePreheatSupportChange = (value: string) => {
    setPreheatSupportError(undefined);

    const nextPreheat = value === '' ? undefined : (value as Preheat);
    const nextPreheated = cleanPreheated({
      ...step.equipment?.preheated,
      support: nextPreheat,
    });

    const proposed = cleanEquipment({
      ...step.equipment,
      preheated: nextPreheated,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setPreheatSupportError(reportedError);
    }
  };

  const handlePreheatVesselChange = (value: string) => {
    setPreheatVesselError(undefined);

    const nextPreheat = value === '' ? undefined : (value as Preheat);
    const nextPreheated = cleanPreheated({
      ...step.equipment?.preheated,
      vessel: nextPreheat,
    });

    const proposed = cleanEquipment({
      ...step.equipment,
      preheated: nextPreheated,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setPreheatVesselError(reportedError);
    }
  };

  const supportValue = supportRef ? `${supportRef.id}@${supportRef.version}` : '';
  const vesselValue = vesselRef ? `${vesselRef.id}@${vesselRef.version}` : '';
  const coverValue = hasVessel ? (step.equipment?.vessel?.cover ?? 'unknown') : '';

  return (
    <div data-testid="step-equipment-items" className="space-y-3 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div role="group" aria-label={t('cooking.edit.support')} className="space-y-1">
          <Ui
            component="fp.select"
            label={t('cooking.edit.support')}
            value={supportValue}
            options={supportOptions}
            cancelText={t('cooking.edit.cancel')}
            okText={t('cooking.edit.ok')}
            onValueChange={handleSupportChange}
            {...(supportError ? { error: supportError } : {})}
            {...(catalogState.status === 'error'
              ? { description: t('cooking.edit.catalogErrorHelp') }
              : catalogState.status === 'loading'
                ? { description: t('cooking.edit.catalogLoadingHelp') }
                : {})}
          />
          <Ui
            component="fp.button"
            variant="quiet"
            ref={supportButtonRef}
            disabled={creationDisabled || createKind !== null || catalogState.status === 'loading'}
            onClick={handleOpenCreateSupport}
          >
            {t('equipment.create.addSupport')}
          </Ui>
          {creationStatus?.kind === 'support' && (
            <p
              role="status"
              className="text-xs text-on-surface bg-surface-container rounded-card p-2"
            >
              {creationStatus.message}
            </p>
          )}
        </div>

        <div role="group" aria-label={t('cooking.edit.vessel')} className="space-y-1">
          <Ui
            component="fp.select"
            label={t('cooking.edit.vessel')}
            value={vesselValue}
            options={vesselOptions}
            cancelText={t('cooking.edit.cancel')}
            okText={t('cooking.edit.ok')}
            onValueChange={handleVesselChange}
            {...(vesselError ? { error: vesselError } : {})}
            {...(catalogState.status === 'error'
              ? { description: t('cooking.edit.catalogErrorHelp') }
              : catalogState.status === 'loading'
                ? { description: t('cooking.edit.catalogLoadingHelp') }
                : {})}
          />
          <Ui
            component="fp.button"
            variant="quiet"
            ref={vesselButtonRef}
            disabled={creationDisabled || createKind !== null || catalogState.status === 'loading'}
            onClick={handleOpenCreateVessel}
          >
            {t('equipment.create.addVessel')}
          </Ui>
          {creationStatus?.kind === 'vessel' && (
            <p
              role="status"
              className="text-xs text-on-surface bg-surface-container rounded-card p-2"
            >
              {creationStatus.message}
            </p>
          )}
        </div>
      </div>

      {createKind !== null && (
        <PersonalEquipmentCreate
          kind={createKind}
          onCreated={handleCreated}
          onCancel={handleCancelCreate}
          onValidityChange={handleCreateValidityChange}
        />
      )}

      <Ui
        component="fp.select"
        label={t('cooking.edit.cover')}
        value={coverValue}
        options={coverOptions}
        disabled={!hasVessel}
        cancelText={t('cooking.edit.cancel')}
        okText={t('cooking.edit.ok')}
        onValueChange={handleCoverChange}
        {...(!hasVessel ? { description: t('cooking.edit.coverHelp') } : {})}
        {...(coverError ? { error: coverError } : {})}
      />

      <div className="space-y-2 pt-1">
        <span className="block text-sm font-medium text-on-surface">
          {t('cooking.edit.preheatTitle')}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Ui
            component="fp.select"
            label={t('cooking.edit.preheatAppliance')}
            value={step.equipment?.preheated?.appliance ?? ''}
            options={preheatOptions}
            cancelText={t('cooking.edit.cancel')}
            okText={t('cooking.edit.ok')}
            onValueChange={handlePreheatApplianceChange}
            {...(preheatApplianceError ? { error: preheatApplianceError } : {})}
          />

          <Ui
            component="fp.select"
            label={t('cooking.edit.preheatSupport')}
            value={step.equipment?.preheated?.support ?? ''}
            options={preheatOptions}
            cancelText={t('cooking.edit.cancel')}
            okText={t('cooking.edit.ok')}
            onValueChange={handlePreheatSupportChange}
            {...(preheatSupportError ? { error: preheatSupportError } : {})}
          />

          <Ui
            component="fp.select"
            label={t('cooking.edit.preheatVessel')}
            value={step.equipment?.preheated?.vessel ?? ''}
            options={preheatOptions}
            cancelText={t('cooking.edit.cancel')}
            okText={t('cooking.edit.ok')}
            onValueChange={handlePreheatVesselChange}
            {...(preheatVesselError ? { error: preheatVesselError } : {})}
          />
        </div>
      </div>
    </div>
  );
}
