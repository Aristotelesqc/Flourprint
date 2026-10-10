import { describe, expect, it } from 'vitest';
import { buildProgram } from '../src/program.js';

describe('flourprint CLI', () => {
  it('prints its version and the contract version', () => {
    let output = '';
    const program = buildProgram()
      .exitOverride()
      .configureOutput({ writeOut: (text) => (output += text) });
    expect(() => program.parse(['--version'], { from: 'user' })).toThrow();
    expect(output.trim()).toBe('0.0.0 (contracts 0.6.0)');
  });
});
