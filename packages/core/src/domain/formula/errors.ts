import type { DomainError } from '../errors.js';

export type FormulaError =
  | DomainError<'InvalidFormula', { path: string; reason: string }>
  | DomainError<'UnknownReference', { path: string; id: string }>
  | DomainError<
      'FlourAllocationExceeded',
      { flour: string; requiredGrams: number; availableGrams: number }
    >
  | DomainError<'WaterAllocationExceeded', { requiredGrams: number; availableGrams: number }>
  | DomainError<
      'IngredientAllocationExceeded',
      { ingredient: string; requiredGrams: number; availableGrams: number }
    >
  | DomainError<'IncompatibleConstraint', { reason: string; field?: string }>;
