interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface Props<T extends string> {
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
  readonly size?: 'regular' | 'small';
}

/** Pill segmented control of the #8 mockups; real buttons, so it is reachable by keyboard. */
export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  size = 'regular',
}: Props<T>) => (
  <div
    role="group"
    className="grid gap-1 rounded-2xl bg-track p-1"
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={selected}
          onClick={() => onChange(option.value)}
          className={`fp-reset rounded-xl text-center ${size === 'small' ? 'h-9 text-[15px]' : 'h-10'} ${
            selected ? 'bg-surface font-bold shadow-sm' : 'font-semibold text-muted'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
