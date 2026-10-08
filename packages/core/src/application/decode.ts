import { isReservedId, parseInstant, type Instant } from '../domain/index.js';

/**
 * Shape checks for untrusted JSON (backups). Structural only: they never run the calculation
 * engine, so a document recorded by an older engine is read as it was written (history.md).
 */
export type Json = Record<string, unknown>;

export const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && !isReservedId(value);
export const isInstant = (value: unknown): value is Instant =>
  typeof value === 'string' && parseInstant(value).ok;
export const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
export const isOptional = <T>(value: unknown, check: (v: unknown) => v is T): boolean =>
  value === undefined || check(value);

/** Thrown inside a decoder and turned into a typed error at its boundary. */
export class Refused extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

export const refuse = (reason: string): never => {
  throw new Refused(reason);
};

export const expect = (ok: boolean, reason: string): void => {
  if (!ok) refuse(reason);
};

/** An object whose keys are identifiers and whose values are finite numbers. */
export const isAmounts = (value: unknown): boolean =>
  isObject(value) && Object.entries(value).every(([key, v]) => isId(key) && isNumber(v));
