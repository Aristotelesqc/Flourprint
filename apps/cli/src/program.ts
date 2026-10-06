import { Command } from 'commander';
import { CONTRACT_VERSION } from '@flourprint/core/contracts';

export const CLI_VERSION = '0.0.0';

/**
 * The CLI only parses arguments and formats output; every calculation goes through
 * @flourprint/core (ADR 0001). Commands are added as their contracts are implemented.
 */
export const buildProgram = (): Command =>
  new Command()
    .name('flourprint')
    .description('Flourprint engine command line')
    .version(`${CLI_VERSION} (contracts ${CONTRACT_VERSION})`);
