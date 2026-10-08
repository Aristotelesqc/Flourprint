import {
  executeBakeCommand,
  loadBake,
  type BakeCommandResult,
  type ExecuteBakeError,
} from '@flourprint/core/application';
import type { BakeCommandPayload, BakeState, Result, UpcastError } from '@flourprint/core/domain';
import type { Services } from './services';

/** Sends one command for the bake as last read (`expectedVersion`), with a fresh command id. */
export const sendBakeCommand = (
  services: Services,
  state: Pick<BakeState, 'bakeId' | 'version'>,
  payload: BakeCommandPayload,
): Promise<Result<BakeCommandResult, ExecuteBakeError>> =>
  executeBakeCommand(
    { store: services.bakes, clock: services.clock, ids: services.ids },
    {
      commandId: services.ids.next(),
      bakeId: state.bakeId,
      expectedVersion: state.version,
      issuedAt: services.clock.now(),
      payload,
    },
  );

/** Active bakes with their state, most recently updated first. */
export const activeBakes = async (
  services: Services,
): Promise<Result<BakeState, UpcastError>[]> => {
  const summaries = (await services.bakes.listBakes())
    .filter((s) => s.status === 'active')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return Promise.all(summaries.map((s) => loadBake(services.bakes, s.bakeId)));
};
