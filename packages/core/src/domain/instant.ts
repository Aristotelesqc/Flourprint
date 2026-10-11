import { err, ok, type Result } from './result.js';
import { domainError, type DomainError } from './errors.js';

/** ISO 8601 instant in UTC, always suffixed with `Z` (docs/contracts/values-and-units.md). */
export type Instant = string & { readonly __brand: 'Instant' };

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export type InvalidInstant = DomainError<'InvalidInstant', { input: string }>;

export const parseInstant = (input: string): Result<Instant, InvalidInstant> => {
  // Date.parse rolls impossible dates over (February 30 → March 2): compare back the fields.
  const time = Date.parse(input);
  if (
    !UTC_ISO.test(input) ||
    Number.isNaN(time) ||
    new Date(time).toISOString().slice(0, 19) !== input.slice(0, 19)
  ) {
    return err(domainError('InvalidInstant', `Not a UTC ISO 8601 instant: ${input}`, { input }));
  }
  return ok(input as Instant);
};
