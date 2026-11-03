import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { Coating, EquipmentEntry, EquipmentShape, Material } from '@flourprint/core/domain';
import { COATINGS, EQUIPMENT_SHAPES, MATERIALS, newEquipmentEntry } from '@flourprint/core/domain';
import { saveEquipmentEntry } from '@flourprint/core/application';
import { Ui } from '../ui/library';
import { useServices } from '../services/services';
import { useGuardedWrite } from '../services/writes';
import { useMessages } from '../i18n/use-messages';
import type { MessageKey } from '../i18n/messages';

export interface PersonalEquipmentCreateProps {
  readonly kind: 'support' | 'vessel';
  readonly onCreated: (entry: EquipmentEntry) => void;
  readonly onCancel: () => void;
  readonly onValidityChange: (blocked: boolean) => void;
}

const SHAPE_LABELS: Readonly<Record<EquipmentShape, MessageKey>> = {
  pullman: 'equipment.shape.pullman',
  loafPan: 'equipment.shape.loafPan',
  dutchOven: 'equipment.shape.dutchOven',
  cloche: 'equipment.shape.cloche',
  skillet: 'equipment.shape.skillet',
  pot: 'equipment.shape.pot',
  roundPan: 'equipment.shape.roundPan',
  sheet: 'equipment.shape.sheet',
  stone: 'equipment.shape.stone',
  steel: 'equipment.shape.steel',
  baguetteTray: 'equipment.shape.baguetteTray',
  rack: 'equipment.shape.rack',
  other: 'equipment.shape.other',
};

const MATERIAL_LABELS: Readonly<Record<Material, MessageKey>> = {
  castIron: 'equipment.material.castIron',
  enamelledCastIron: 'equipment.material.enamelledCastIron',
  carbonSteel: 'equipment.material.carbonSteel',
  stainlessSteel: 'equipment.material.stainlessSteel',
  aluminizedSteel: 'equipment.material.aluminizedSteel',
  aluminium: 'equipment.material.aluminium',
  ceramic: 'equipment.material.ceramic',
  stoneware: 'equipment.material.stoneware',
  cordierite: 'equipment.material.cordierite',
  glass: 'equipment.material.glass',
  silicone: 'equipment.material.silicone',
  other: 'equipment.material.other',
  unknown: 'equipment.material.unknown',
};

const COATING_LABELS: Readonly<Record<Coating, MessageKey>> = {
  none: 'equipment.coating.none',
  nonStick: 'equipment.coating.nonStick',
  silicone: 'equipment.coating.silicone',
  enamel: 'equipment.coating.enamel',
  seasoning: 'equipment.coating.seasoning',
  other: 'equipment.coating.other',
  unknown: 'equipment.coating.unknown',
};

/**
 * Inline authoring section for personal baking supports and vessels (Recipe #169, L1/L2/L3, L71, L89, L129, L143).
 * Does not mutate recipe draft; saves directly to the personal equipment catalogue via domain application service.
 */
export function PersonalEquipmentCreate({
  kind,
  onCreated,
  onCancel,
  onValidityChange,
}: PersonalEquipmentCreateProps) {
  const { t, error } = useMessages();
  const services = useServices();
  const { busy, run } = useGuardedWrite();
  const id = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const nameInputId = `${id}-name`;
  const nameErrorId = `${id}-name-error`;
  const notesInputId = `${id}-notes`;

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    nameInputRef.current?.focus();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [name, setName] = useState('');
  const [shape, setShape] = useState<EquipmentShape | ''>('');
  const [material, setMaterial] = useState<Material | ''>('');
  const [coating, setCoating] = useState<Coating | ''>('');
  const [notes, setNotes] = useState('');

  const [nameError, setNameError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | undefined>();

  const isDirty =
    name.length > 0 || notes.length > 0 || shape !== '' || material !== '' || coating !== '';

  const isBlocked = isDirty || busy;

  useEffect(() => {
    onValidityChange(isBlocked);
  }, [onValidityChange, isBlocked]);

  useEffect(() => {
    return () => {
      onValidityChange(false);
    };
  }, [onValidityChange]);

  const shapeOptions = useMemo(() => {
    return [
      { id: '', label: t('cooking.edit.notSpecified') },
      ...EQUIPMENT_SHAPES.map((s) => ({
        id: s,
        label: t(SHAPE_LABELS[s]),
      })),
    ];
  }, [t]);

  const materialOptions = useMemo(() => {
    return [
      { id: '', label: t('cooking.edit.notSpecified') },
      ...MATERIALS.map((m) => ({
        id: m,
        label: t(MATERIAL_LABELS[m]),
      })),
    ];
  }, [t]);

  const coatingOptions = useMemo(() => {
    return [
      { id: '', label: t('cooking.edit.notSpecified') },
      ...COATINGS.map((c) => ({
        id: c,
        label: t(COATING_LABELS[c]),
      })),
    ];
  }, [t]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) setNameError(undefined);
    if (generalError) setGeneralError(undefined);
  };

  const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if (generalError) setGeneralError(undefined);
  };

  const handleCreate = async () => {
    setNameError(undefined);
    setGeneralError(undefined);

    const trimmedName = name.trim();
    const newId = services.ids.next();
    const createdAt = services.realClock.now();

    const base = newEquipmentEntry({
      id: newId,
      kind,
      name: trimmedName,
      createdAt,
    });

    const entry: EquipmentEntry = {
      ...base,
      ...(shape !== '' ? { shape } : {}),
      ...(material !== '' ? { material } : {}),
      ...(coating !== '' ? { coating } : {}),
      ...(notes.trim().length > 0 ? { notes } : {}),
    };

    const res = await run(() => saveEquipmentEntry(services.equipment, entry));

    if (!isMounted.current) return;

    if (!res.ok) {
      if (res.reason === 'storage') {
        setGeneralError(t('equipment.create.storageError'));
      }
      return;
    }

    const saveRes = res.value;
    if (saveRes.ok) {
      onCreated(saveRes.value);
    } else {
      const err = saveRes.error;
      if (err.code === 'HeadConflict') {
        setGeneralError(t('equipment.create.conflict'));
      } else if (err.code === 'InvalidEquipmentEntry' && err.details?.field === 'name') {
        setNameError(error(err));
      } else {
        setGeneralError(error(err));
      }
    }
  };

  return (
    <section
      data-testid="personal-equipment-create"
      aria-labelledby={`${id}-heading`}
      className="space-y-3 p-3 bg-surface-container rounded-card border border-outline"
    >
      <h4 id={`${id}-heading`} className="text-sm font-semibold text-on-surface">
        {kind === 'support'
          ? t('equipment.create.supportTitle')
          : t('equipment.create.vesselTitle')}
      </h4>

      <p className="text-xs text-muted">{t('equipment.create.explanation')}</p>

      <div className="space-y-1">
        <label htmlFor={nameInputId} className="block text-sm font-medium text-on-surface">
          {t('equipment.create.name')}
        </label>
        <input
          ref={nameInputRef}
          id={nameInputId}
          type="text"
          value={name}
          disabled={busy}
          placeholder={t('equipment.create.namePlaceholder')}
          aria-required="true"
          aria-invalid={nameError ? 'true' : undefined}
          aria-describedby={nameError ? nameErrorId : undefined}
          onChange={handleNameChange}
          className={`w-full min-h-12 bg-field-background border rounded-card px-3 py-2 text-body text-on-surface focus-visible:fp-focus-ring focus-visible:outline-none ${
            nameError ? 'border-error' : 'border-field-outline focus-visible:border-primary'
          } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        {nameError && (
          <p id={nameErrorId} role="alert" className="text-xs text-error mt-1">
            {nameError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Ui
          component="fp.select"
          label={t('equipment.create.shape')}
          value={shape}
          options={shapeOptions}
          disabled={busy}
          cancelText={t('cooking.edit.cancel')}
          okText={t('cooking.edit.ok')}
          onValueChange={(val) => {
            setShape(val as EquipmentShape | '');
            setGeneralError(undefined);
          }}
        />

        <Ui
          component="fp.select"
          label={t('equipment.create.material')}
          value={material}
          options={materialOptions}
          disabled={busy}
          cancelText={t('cooking.edit.cancel')}
          okText={t('cooking.edit.ok')}
          onValueChange={(val) => {
            setMaterial(val as Material | '');
            setGeneralError(undefined);
          }}
        />

        <Ui
          component="fp.select"
          label={t('equipment.create.coating')}
          value={coating}
          options={coatingOptions}
          disabled={busy}
          cancelText={t('cooking.edit.cancel')}
          okText={t('cooking.edit.ok')}
          onValueChange={(val) => {
            setCoating(val as Coating | '');
            setGeneralError(undefined);
          }}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={notesInputId} className="block text-sm font-medium text-on-surface">
          {t('equipment.create.notes')}
        </label>
        <textarea
          id={notesInputId}
          rows={3}
          value={notes}
          disabled={busy}
          placeholder={t('equipment.create.notesPlaceholder')}
          onChange={handleNotesChange}
          className={`w-full min-h-20 bg-field-background border rounded-card px-3 py-2 text-body text-on-surface focus-visible:fp-focus-ring focus-visible:outline-none border-field-outline focus-visible:border-primary ${
            busy ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {generalError && (
        <p role="alert" className="text-xs text-error">
          {generalError}
        </p>
      )}

      {isDirty && (
        <p className="text-xs text-muted" data-testid="personal-equipment-dirty-hint">
          {t('equipment.create.dirtyHint')}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Ui
          component="fp.button"
          variant="quiet"
          className="shrink-0 whitespace-nowrap"
          disabled={busy}
          onClick={onCancel}
        >
          {t('equipment.create.cancel')}
        </Ui>
        <Ui
          component="fp.button"
          variant="primary"
          className="shrink-0 whitespace-nowrap"
          disabled={busy}
          onClick={handleCreate}
        >
          {t('equipment.create.submit')}
        </Ui>
      </div>
    </section>
  );
}
