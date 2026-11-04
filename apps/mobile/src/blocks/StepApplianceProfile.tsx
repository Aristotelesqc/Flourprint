import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type {
  EquipmentEntry,
  EquipmentRef,
  ProcessStep,
  StepEquipment,
} from '@flourprint/core/domain';
import { equipmentCatalog } from '@flourprint/core/application';
import { Ui } from '../ui/library';
import { useServices } from '../services/services';
import { useMessages } from '../i18n/use-messages';
import { PersonalEquipmentCreate } from './PersonalEquipmentCreate';
import { cleanEquipment, formatEntryName, useEquipmentRef } from './StepEquipmentItems';

export interface StepApplianceProfileProps {
  readonly step: ProcessStep;
  readonly onChange: (
    equipment: StepEquipment | undefined,
    reportError: (message: string | undefined) => void,
  ) => boolean;
  readonly onValidityChange?: (invalid: boolean) => void;
  readonly creationDisabled?: boolean;
  readonly onCreationOpenChange?: (open: boolean) => void;
}

interface CatalogState {
  readonly status: 'loading' | 'ready' | 'error';
  readonly entries: readonly EquipmentEntry[];
}

/**
 * Step appliance profile selection and inline profile creation (Recipe #169, release 0.3).
 * A profile is optional and can be selected without setting step.appliance.
 */
export function StepApplianceProfile({
  step,
  onChange,
  onValidityChange,
  creationDisabled,
  onCreationOpenChange,
}: StepApplianceProfileProps) {
  const { t } = useMessages();
  const services = useServices();

  const [catalogState, setCatalogState] = useState<CatalogState>({
    status: 'loading',
    entries: [],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState<string | undefined>();
  const [createInvalid, setCreateInvalid] = useState(false);
  const [profileError, setProfileError] = useState<string | undefined>();

  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const initiatingCreateRef = useRef(false);

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
    if (isCreating) return;
    if (initiatingCreateRef.current) {
      initiatingCreateRef.current = false;
      addButtonRef.current?.focus();
    }
  }, [isCreating]);

  const handleOpenCreate = () => {
    setCreationStatus(undefined);
    initiatingCreateRef.current = true;
    setIsCreating(true);
    onCreationOpenChange?.(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setCreateInvalid(false);
    onCreationOpenChange?.(false);
  };

  const handleCreated = (entry: EquipmentEntry) => {
    setCatalogState((prev) => ({
      ...prev,
      entries: [...prev.entries, entry],
    }));
    setCreationStatus(
      t('equipment.create.createdStatus', {
        name: formatEntryName(entry, t),
      }),
    );
    setIsCreating(false);
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
          setCatalogState({ status: 'error', entries: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  });

  useEffect(() => loadCatalog(), [services]);

  const profileRef = step.equipment?.profile;
  const resolvedProfile = useEquipmentRef(profileRef, 'appliance');

  const { profileOptions, profileMap } = useMemo(() => {
    const options: { id: string; label: string }[] = [
      { id: '', label: t('cooking.edit.notSpecified') },
    ];
    const map = new Map<string, EquipmentRef>();

    for (const entry of catalogState.entries) {
      if (entry.kind === 'appliance' && !entry.archived) {
        const key = `${entry.id}@${entry.version}`;
        options.push({ id: key, label: formatEntryName(entry, t) });
        map.set(key, { id: entry.id, version: entry.version });
      }
    }

    if (profileRef) {
      const selectedKey = `${profileRef.id}@${profileRef.version}`;
      if (!map.has(selectedKey)) {
        let label: string;
        if (resolvedProfile.status === 'ready') {
          const baseName = formatEntryName(resolvedProfile.entry, t);
          label = t('cooking.edit.itemInRecipe', { name: baseName });
        } else if (resolvedProfile.status === 'loading') {
          label = t('equipment.label.loading');
        } else if (resolvedProfile.status === 'error') {
          label = t('equipment.label.error');
        } else {
          label = t('equipment.label.missing');
        }
        options.push({ id: selectedKey, label });
        map.set(selectedKey, profileRef);
      }
    }

    return { profileOptions: options, profileMap: map };
  }, [catalogState.entries, profileRef, resolvedProfile, t]);

  const handleProfileChange = (value: string) => {
    setProfileError(undefined);

    let nextProfile: EquipmentRef | undefined;
    if (value !== '') {
      const targetRef = profileMap.get(value);
      if (!targetRef) return;
      nextProfile = targetRef;
    }

    const proposed = cleanEquipment({
      ...step.equipment,
      profile: nextProfile,
    });

    let reportedError: string | undefined;
    const accepted = onChange(proposed, (msg) => {
      reportedError = msg;
    });

    if (!accepted && reportedError) {
      setProfileError(reportedError);
    }
  };

  const profileValue = profileRef ? `${profileRef.id}@${profileRef.version}` : '';

  return (
    <div
      role="group"
      aria-label={t('cooking.edit.profile')}
      data-testid="step-appliance-profile"
      className="space-y-1"
    >
      <Ui
        component="fp.select"
        label={t('cooking.edit.profile')}
        value={profileValue}
        options={profileOptions}
        cancelText={t('cooking.edit.cancel')}
        okText={t('cooking.edit.ok')}
        onValueChange={handleProfileChange}
        {...(profileError ? { error: profileError } : {})}
        {...(catalogState.status === 'error'
          ? { description: t('cooking.edit.catalogErrorHelp') }
          : catalogState.status === 'loading'
            ? { description: t('cooking.edit.catalogLoadingHelp') }
            : { description: t('cooking.edit.profileHelp') })}
      />

      {resolvedProfile.status === 'ready' && resolvedProfile.entry.appliance && (
        <p data-testid="profile-appliance-type" className="text-xs text-muted">
          {t('cooking.edit.profileApplianceType', {
            type:
              resolvedProfile.entry.appliance === 'other'
                ? t('cooking.edit.otherAppliance')
                : t(`equipment.appliance.${resolvedProfile.entry.appliance}`),
          })}
        </p>
      )}

      <Ui
        component="fp.button"
        variant="quiet"
        ref={addButtonRef}
        disabled={creationDisabled || isCreating || catalogState.status === 'loading'}
        onClick={handleOpenCreate}
      >
        {t('equipment.create.addAppliance')}
      </Ui>

      {creationStatus && (
        <p role="status" className="text-xs text-on-surface bg-surface-container rounded-card p-2">
          {creationStatus}
        </p>
      )}

      {isCreating && (
        <PersonalEquipmentCreate
          kind="appliance"
          onCreated={handleCreated}
          onCancel={handleCancelCreate}
          onValidityChange={handleCreateValidityChange}
        />
      )}
    </div>
  );
}
