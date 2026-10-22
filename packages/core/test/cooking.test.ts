import { describe, expect, it } from 'vitest';
import {
  COOKING_OPERATIONS,
  doughSteps,
  intendedOutcome,
  isCookingStep,
  outcomeChoiceRequired,
  outcomeProblem,
  validateProcess,
  type Process,
  type ProcessStep,
} from '../src/domain/index.js';

const step = (id: string, operation: string, dependsOn: string[] = []): ProcessStep => ({
  id,
  operation,
  dependsOn,
  schedule: 'asap',
  plannedDurationS: 600,
});

describe('cooking operations (process.md)', () => {
  it('names the six cooking operations, not preheating nor proofing', () => {
    expect(COOKING_OPERATIONS).toEqual(['bake', 'boil', 'steam', 'fry', 'panCook', 'grill']);
    expect(isCookingStep({ operation: 'preheat' })).toBe(false);
    expect(isCookingStep({ operation: 'proof' })).toBe(false);
  });

  it('ends the dough at any cooking stage, not only at a bake', () => {
    // Fried dough: before 0.11.0 the fry step counted as a dough step.
    const fried: Process = {
      steps: [step('mix', 'mix'), step('proof', 'proof', ['mix']), step('fry', 'fry', ['proof'])],
    };
    expect(doughSteps(fried)?.map((s) => s.id)).toEqual(['proof']);
    const grilled: Process = {
      steps: [step('mix', 'mix'), step('bulk', 'bulk', ['mix']), step('bbq', 'grill', ['bulk'])],
    };
    expect(doughSteps(grilled)?.map((s) => s.id)).toEqual(['bulk']);
  });
});

describe('intended outcome (bake-session.md)', () => {
  const dough: Process = { steps: [step('mix', 'mix'), step('divide', 'divide', ['mix'])] };
  const pizza: Process = { steps: [...dough.steps, step('pan', 'panCook', ['divide'])] };

  it('is cooked with a cooking step, else the raw dough, unless the recipe says otherwise', () => {
    expect(intendedOutcome(pizza)).toEqual({ result: 'cooked' });
    expect(intendedOutcome(dough)).toEqual({ result: 'dough' });
    const frozen = { result: 'dough', dough: 'frozen', pieces: 8 } as const;
    expect(intendedOutcome({ ...pizza, intendedOutcome: frozen })).toEqual(frozen);
  });

  it('accepts a dough disposition and pieces only with a dough result', () => {
    expect(outcomeProblem({ result: 'cookedAndDough', dough: 'given', pieces: 2 })).toBeUndefined();
    expect(outcomeProblem({ result: 'cooked', dough: 'frozen' })?.field).toBe('dough');
    expect(outcomeProblem({ result: 'cooked', pieces: 2 })?.field).toBe('pieces');
    expect(outcomeProblem({ result: 'dough', pieces: 1.5 })?.field).toBe('pieces');
  });

  it('is validated with the process', () => {
    expect(validateProcess({ ...dough, intendedOutcome: { result: 'dough' } }).ok).toBe(true);
    expect(
      validateProcess({ ...dough, intendedOutcome: { result: 'cooked', dough: 'sold' } }),
    ).toMatchObject({ ok: false, error: { code: 'InvalidProcess' } });
  });
});

describe('outcomeChoiceRequired', () => {
  const baked: Process = { steps: [step('mix', 'mix'), step('bake', 'bake', ['mix'])] };
  const frozen: Process = {
    steps: [step('mix', 'mix')],
    intendedOutcome: { result: 'dough', dough: 'frozen' },
  };
  it('asks only for a cooked intent with no cooking step completed', () => {
    expect(outcomeChoiceRequired(baked, (id) => id === 'mix')).toBe(true);
    expect(outcomeChoiceRequired(baked, () => true)).toBe(false);
    // A dough-only recipe finishes with its intended outcome, nothing cooked.
    expect(outcomeChoiceRequired(frozen, () => false)).toBe(false);
    expect(outcomeChoiceRequired({ steps: [step('mix', 'mix')] }, () => false)).toBe(false);
  });
});
