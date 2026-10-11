#!/usr/bin/env node
import { ReportedError } from './formula.js';
import { buildProgram } from './program.js';

try {
  await buildProgram().parseAsync(process.argv);
} catch (error) {
  if (!(error instanceof ReportedError)) throw error;
  process.exitCode = 1;
}
