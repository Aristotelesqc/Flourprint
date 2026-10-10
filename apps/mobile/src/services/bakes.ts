import {
  executeBakeCommand,
  loadBake,
  type BakeCommandResult,
  type ExecuteBakeError,
} from '@flourprint/core/application';
import type { BakeCommandPayload, BakeState, Result, UpcastError } from '@flourprint/core/domain';
import { BAKES_CHANGED } from './notifications';
import type { Services } from './services';

/** Sends one command for the bake as last read (`expectedVersion`). */
export const sendBakeCommand = (
  services: Services,
  state: Pick<BakeState, 'bakeId' | 'version'>,
  payload: BakeCommandPayload,
  /** Reuse the id of a command whose outcome is unknown, so a retry never acts twice (D7). */
  commandId: string = services.ids.next(),
): Promise<Result<BakeCommandResult, ExecuteBakeError>> =>
  executeBakeCommand(
    { store: services.bakes, clock: services.clock, ids: services.ids },
    {
      commandId,
      bakeId: state.bakeId,
      expectedVersion: state.version,
      issuedAt: services.clock.now(),
      payload,
    },
  ).finally(() => window.dispatchEvent(new Event(BAKES_CHANGED)));

/** Active bakes with their state (or why it cannot be read), most recently updated first. */
export const activeBakes = async (
  services: Services,
): Promise<{ readonly bakeId: string; readonly result: Result<BakeState, UpcastError> }[]> => {
  const summaries = (await services.bakes.listBakes())
    .filter((s) => s.status === 'active')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return Promise.all(
    summaries.map(async (s) => ({
      bakeId: s.bakeId,
      result: await loadBake(services.bakes, s.bakeId),
    })),
  );
};
