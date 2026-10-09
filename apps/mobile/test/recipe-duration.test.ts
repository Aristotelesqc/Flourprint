import { describe, expect, it } from 'vitest';
import type { Instant, Process } from '@flourprint/core/domain';
import { recipeDuration } from '../src/services/recipe-duration';

const now = '2026-10-09T08:00:00.000Z' as Instant;
const H = 3600;

describe('recipe card duration', () => {
  it('is complete only when every step has a known end', () => {
    const process: Process = {
      steps: [
        {
          id: 'poolish',
          operation: 'preferment',
          dependsOn: [],
          schedule: 'asap',
          plannedDurationS: 12 * H,
        },
        {
          id: 'tangzhong',
          operation: 'scald',
          dependsOn: [],
          schedule: 'asap',
          plannedDurationS: H,
        },
        {
          id: 'mix',
          operation: 'mix',
          dependsOn: ['poolish', 'tangzhong'],
          schedule: 'asap',
          plannedDurationS: H,
        },
      ],
    };
    expect(recipeDuration(process, now)).toEqual({ kind: 'complete', seconds: 13 * H });
  });

  it('gives only a lower bound when a later step has no duration', () => {
    // A 12 h poolish then mixing and baking without durations: 12 h is not the recipe's length.
    const process: Process = {
      steps: [
        {
          id: 'poolish',
          operation: 'preferment',
          dependsOn: [],
          schedule: 'asap',
          plannedDurationS: 12 * H,
        },
        { id: 'mix', operation: 'mix', dependsOn: ['poolish'], schedule: 'asap' },
        { id: 'bake', operation: 'bake', dependsOn: ['mix'], schedule: 'asap' },
      ],
    };
    expect(recipeDuration(process, now)).toEqual({ kind: 'atLeast', seconds: 12 * H });
  });

  it('is unknown when no end is known', () => {
    const process: Process = {
      steps: [{ id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap' }],
    };
    expect(recipeDuration(process, now)).toEqual({ kind: 'unknown' });
  });
});
