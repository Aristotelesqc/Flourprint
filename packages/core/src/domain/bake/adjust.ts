/**
 * Planned duration of a step after the baker asks for `deltaS` more (or less) seconds: never below
 * zero, the step then shows as overdue (bake-session.md, AdjustStep). `AdjustStep` itself takes the
 * absolute duration.
 */
export const adjustedDurationS = (currentS: number, deltaS: number): number =>
  Math.max(0, currentS + deltaS);
