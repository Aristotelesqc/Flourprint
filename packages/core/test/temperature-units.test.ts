import { describe, expect, it } from 'vitest';
import {
  celsiusFrom,
  celsiusTo,
  setpointContext,
  temperatureContext,
} from '../src/domain/index.js';

describe('temperature display units (values-and-units.md)', () => {
  it('converts a temperature both ways', () => {
    expect(celsiusTo(21, 'F')).toBeCloseTo(69.8, 10);
    expect(celsiusTo(100, 'F')).toBe(212);
    expect(celsiusFrom(75, 'F')).toBeCloseTo(23.888_888_9, 6);
    expect(celsiusFrom(celsiusTo(4, 'F'), 'F')).toBeCloseTo(4, 10);
    expect(celsiusTo(21, 'C')).toBe(21);
    expect(celsiusFrom(21, 'C')).toBe(21);
  });

  it('converts a difference by the scale only', () => {
    expect(celsiusTo(10, 'F', true)).toBe(18);
    expect(celsiusFrom(18, 'F', true)).toBe(10);
    expect(celsiusTo(0, 'F', true)).toBe(0);
  });

  it('classifies a step by its operation and place', () => {
    expect(temperatureContext({ operation: 'bake' })).toBe('oven');
    expect(temperatureContext({ operation: 'preheat' })).toBe('oven');
    expect(temperatureContext({ operation: 'boil' })).toBe('oven');
    expect(temperatureContext({ operation: 'other', conditions: { location: 'oven' } })).toBe(
      'oven',
    );
    expect(temperatureContext({ operation: 'retard' })).toBe('cold');
    expect(temperatureContext({ operation: 'proof', conditions: { location: 'fridge' } })).toBe(
      'cold',
    );
    expect(temperatureContext({ operation: 'bulk', conditions: { location: 'freezer' } })).toBe(
      'cold',
    );
    expect(temperatureContext({ operation: 'bulk' })).toBe('ambient');
    expect(temperatureContext({ operation: 'mix' })).toBe('ambient');
  });

  it('classifies an equipment setpoint by its appliance, not by its step', () => {
    expect(setpointContext({ appliance: 'proofer' })).toBe('ambient');
    expect(setpointContext({ appliance: 'oven' })).toBe('oven');
    expect(setpointContext({ appliance: 'fryer' })).toBe('oven');
    expect(setpointContext({ appliance: 'other' })).toBe('oven');
    expect(setpointContext({})).toBe('oven');
    // An oven used for a proof (equipment.md, example 5) keeps the oven unit although the step
    // is a proof, which `temperatureContext` classifies as ambient.
    expect(temperatureContext({ operation: 'proof' })).toBe('ambient');
    expect(setpointContext({ appliance: 'oven' })).toBe('oven');
  });
});
