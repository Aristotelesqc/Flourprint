import type {
  AppendError,
  AppendInput,
  BakeEventStore,
  StoredCommand,
} from '@flourprint/core/application';
import {
  domainError,
  err,
  ok,
  type BakeEvent,
  type BakeSummary,
  type Result,
} from '@flourprint/core/domain';
import { assertAppendable } from '../shared/append-checks.js';
import type { SqlDriver, SqlExecutor } from './driver.js';

interface CommandRow {
  command_id: string;
  bake_id: string;
  content: string;
  first_seq: number;
  last_seq: number;
}

const events = async (
  sql: SqlExecutor,
  bakeId: string,
  fromSeq = 1,
  toSeq = Number.MAX_SAFE_INTEGER,
): Promise<BakeEvent[]> => {
  const rows = await sql.query<{ document: string }>(
    'SELECT document FROM bake_events WHERE bake_id = ? AND seq BETWEEN ? AND ? ORDER BY seq',
    [bakeId, fromSeq, toSeq],
  );
  return rows.map((row) => JSON.parse(row.document) as BakeEvent);
};

const findCommand = async (
  sql: SqlExecutor,
  commandId: string,
): Promise<StoredCommand | undefined> => {
  const [row] = await sql.query<CommandRow>('SELECT * FROM bake_commands WHERE command_id = ?', [
    commandId,
  ]);
  if (!row) return undefined;
  return {
    commandId: row.command_id,
    bakeId: row.bake_id,
    content: row.content,
    events: await events(sql, row.bake_id, Number(row.first_seq), Number(row.last_seq)),
  };
};

/** Bake event store on any SQLite driver (docs/contracts/bake-session.md, persistence.md). */
export class SqlBakeEventStore implements BakeEventStore {
  constructor(private readonly driver: SqlDriver) {}

  findCommand(commandId: string): Promise<StoredCommand | undefined> {
    return this.driver.transaction((tx) => findCommand(tx, commandId));
  }

  loadEvents(bakeId: string): Promise<readonly BakeEvent[]> {
    return this.driver.transaction((tx) => events(tx, bakeId));
  }

  async listBakes(): Promise<readonly BakeSummary[]> {
    const rows = await this.driver.query<{ summary: string }>(
      'SELECT summary FROM bakes ORDER BY updated_at DESC',
    );
    return rows.map((row) => JSON.parse(row.summary) as BakeSummary);
  }

  append(input: AppendInput): Promise<Result<readonly BakeEvent[], AppendError>> {
    return this.driver.transaction(async (tx) => {
      const previous = await findCommand(tx, input.command.commandId);
      if (previous) {
        return previous.content === input.command.content
          ? ok(previous.events)
          : err(
              domainError(
                'CommandIdReused',
                `Command ${input.command.commandId} was used with another content`,
                { commandId: input.command.commandId },
              ),
            );
      }
      const [row] = await tx.query<{ version: number }>(
        'SELECT COALESCE(MAX(seq), 0) AS version FROM bake_events WHERE bake_id = ?',
        [input.command.bakeId],
      );
      const currentVersion = Number(row?.version ?? 0);
      if (currentVersion !== input.expectedVersion) {
        return err(
          domainError('VersionConflict', `Bake is at version ${currentVersion}`, {
            currentVersion,
          }),
        );
      }
      assertAppendable(input, new Set());
      for (const event of input.events) {
        await tx.run(
          'INSERT INTO bake_events (bake_id, seq, event_id, schema_version, document) VALUES (?, ?, ?, ?, ?)',
          [event.bakeId, event.seq, event.eventId, event.schemaVersion, JSON.stringify(event)],
        );
      }
      await tx.run(
        'INSERT INTO bake_commands (command_id, bake_id, content, first_seq, last_seq) VALUES (?, ?, ?, ?, ?)',
        [
          input.command.commandId,
          input.command.bakeId,
          input.command.content,
          input.expectedVersion + 1,
          input.expectedVersion + input.events.length,
        ],
      );
      await tx.run(
        `INSERT INTO bakes (bake_id, summary, status, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (bake_id) DO UPDATE SET summary = excluded.summary,
           status = excluded.status, updated_at = excluded.updated_at`,
        [
          input.summary.bakeId,
          JSON.stringify(input.summary),
          input.summary.status,
          input.summary.updatedAt,
        ],
      );
      return ok(input.events);
    });
  }
}
