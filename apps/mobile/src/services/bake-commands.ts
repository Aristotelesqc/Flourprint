import { useState } from 'react';
import type { BakeCommandPayload, BakeState, DomainError } from '@flourprint/core/domain';
import { sendBakeCommand } from './bakes';
import type { Services } from './services';
import { useGuardedWrite } from './writes';

/** A command whose outcome is unknown (storage error): retried with its id, never sent twice. */
export interface PendingCommand {
  readonly bakeId: string;
  readonly commandId: string;
  readonly version: number;
  readonly payload: BakeCommandPayload;
}

export type CommandOutcome =
  | { readonly kind: 'ok'; readonly state: BakeState }
  | { readonly kind: 'rejected'; readonly error: DomainError }
  /** Another write is running, or an uncertain one waits for its retry: nothing was sent. */
  | { readonly kind: 'busy' }
  /** The outcome is unknown; `retry` resends the same command. */
  | { readonly kind: 'storage' };

/**
 * Bake commands for a screen (bake-session.md, D7): one write at a time, and a command whose
 * outcome is unknown is kept with its id until it is retried, so it never acts twice. Shared by
 * bake mode and the overview of running bakes.
 */
export const useBakeCommands = (services: Services) => {
  const writes = useGuardedWrite();
  const [pending, setPending] = useState<PendingCommand>();

  const execute = async (command: PendingCommand): Promise<CommandOutcome> => {
    const result = await writes.run(() =>
      sendBakeCommand(
        services,
        { bakeId: command.bakeId, version: command.version },
        command.payload,
        command.commandId,
      ),
    );
    if (!result.ok) {
      if (result.reason === 'busy') return { kind: 'busy' };
      setPending(command);
      return { kind: 'storage' };
    }
    setPending(undefined);
    return result.value.ok
      ? { kind: 'ok', state: result.value.value.state }
      : { kind: 'rejected', error: result.value.error };
  };

  /** Sends a new command, unless an uncertain one waits for its retry. */
  const send = async (
    state: Pick<BakeState, 'bakeId' | 'version'>,
    payload: BakeCommandPayload,
  ): Promise<CommandOutcome> =>
    pending
      ? { kind: 'busy' }
      : execute({
          bakeId: state.bakeId,
          commandId: services.ids.next(),
          version: state.version,
          payload,
        });

  /** Resends the uncertain command with its original id. */
  const retry = async (): Promise<CommandOutcome> =>
    pending ? execute(pending) : { kind: 'busy' };

  return { busy: writes.busy, pending, send, retry };
};
