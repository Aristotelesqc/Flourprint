import './v1.css';
import React from 'react';
import type { CheckboxProps, IngredientRowProps } from '../../props.ts';
import { library } from '../../index.ts';
const Checkbox = (props: CheckboxProps) => (
  <library.Slot component="fp.weighing-checkbox" {...props} />
);

export const IngredientRow: React.FC<IngredientRowProps> = ({
  id,
  name,
  gramsText,
  pctText,
  note,
  checked,
  onToggle,
  checkLabel,
  editing = false,
  children,
}) => {
  const handleRowClick = () => {
    if (editing) return; // Prevent accidental checkbox toggle during in-place field edit
    onToggle();
  };

  const handleNestedInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      data-fp-component="fp.ingredient-row"
      data-fp-version="v1"
      data-testid={`ingredient-row-${id}`}
      className={`ingredient-row ${checked ? 'weighed' : ''} ${editing ? 'is-editing' : ''}`}
      onClick={handleRowClick}
    >
      {!editing && (
        <div onClick={handleNestedInteractiveClick}>
          <Checkbox hideLabel checked={checked} onChange={() => onToggle()} label={checkLabel} />
        </div>
      )}

      <div className="ingredient-info stack">
        <span className="ingredient-name">{name}</span>
        <div className="ingredient-meta row">
          {note && <span className="ingredient-note">• {note}</span>}
        </div>
      </div>

      {pctText && <span className="ingredient-pct tabular">{pctText}</span>}
      <div className="ingredient-row-end" onClick={handleNestedInteractiveClick}>
        {editing && children ? (
          <div className="ingredient-edit-wrap">{children}</div>
        ) : (
          <span className="ingredient-grams tabular">{gramsText}</span>
        )}
      </div>
    </div>
  );
};

export default library.version({
  id: 'fp.ingredient-row',
  version: 'v1',
  component: IngredientRow,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Read',
      props: {
        id: 'catalogue',
        name: 'Bread flour',
        gramsText: '314 g',
        pctText: '100 % of flour',
        checked: false,
        onToggle: () => {},
        checkLabel: 'Weighed: bread flour',
      },
    },
    {
      name: 'Weighed',
      props: {
        id: 'catalogue-checked',
        name: 'Bread flour',
        gramsText: '314 g',
        pctText: '100 % of flour',
        checked: true,
        onToggle: () => {},
        checkLabel: 'Weighed: bread flour',
      },
    },
  ],
});
