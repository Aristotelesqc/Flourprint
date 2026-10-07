import type { DatabaseSync } from 'node:sqlite';
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
import { immediate } from './database.js';

interface CommandRow {
  command_id: string;
  bake_id: string;
  content: string;
  first_seq: number;
  last_seq: number;
}

/** Bake event store on SQLite (docs/contracts/bake-session.md, persistence.md). */
export class SqliteNodeBakeEventStore implements BakeEventStore {
  constructor(private readonly db: DatabaseSync) {}

  async findCommand(commandId: string): Promise<StoredCommand | undefined> {
    return this.#findCommand(commandId);
  }

  async loadEvents(bakeId: string): Promise<readonly BakeEvent[]> {
    return this.#events(bakeId);
  }

  async listBakes(): Promise<readonly BakeSummary[]> {
    const rows = this.db.prepare('SELECT summary FROM bakes ORDER BY updated_at DESC').all() as {
      summary: string;
    }[];
    return rows.map((row) => JSON.parse(row.summary) as BakeSummary);
  }

  async append(input: AppendInput): Promise<Result<readonly BakeEvent[], AppendError>> {
    return immediate(this.db, () => {
      const previous = this.#findCommand(input.command.commandId);
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
      const row = this.db
        .prepare('SELECT COALESCE(MAX(seq), 0) AS version FROM bake_events WHERE bake_id = ?')
        .get(input.command.bakeId) as { version: number };
      if (row.version !== input.expectedVersion) {
        return err(
          domainError('VersionConflict', `Bake is at version ${row.version}`, {
            currentVersion: row.version,
          }),
        );
      }
      assertAppendable(input, new Set());

      const insertEvent = this.db.prepare(
        'INSERT INTO bake_events (bake_id, seq, event_id, schema_version, document) VALUES (?, ?, ?, ?, ?)',
      );
      for (const event of input.events) {
        insertEvent.run(
          event.bakeId,
          event.seq,
          event.eventId,
          event.schemaVersion,
          JSON.stringify(event),
        );
      }
      this.db
        .prepare(
          'INSERT INTO bake_commands (command_id, bake_id, content, first_seq, last_seq) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          input.command.commandId,
          input.command.bakeId,
          input.command.content,
          input.expectedVersion + 1,
          input.expectedVersion + input.events.length,
        );
      this.db
        .prepare(
          `INSERT INTO bakes (bake_id, summary, status, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (bake_id) DO UPDATE SET summary = excluded.summary,
             status = excluded.status, updated_at = excluded.updated_at`,
        )
        .run(
          input.summary.bakeId,
          JSON.stringify(input.summary),
          input.summary.status,
          input.summary.updatedAt,
        );
      return ok(input.events);
    });
  }

  #events(bakeId: string, fromSeq = 1, toSeq = Number.MAX_SAFE_INTEGER): BakeEvent[] {
    const rows = this.db
      .prepare(
        'SELECT document FROM bake_events WHERE bake_id = ? AND seq BETWEEN ? AND ? ORDER BY seq',
      )
      .all(bakeId, fromSeq, toSeq) as { document: string }[];
    return rows.map((row) => JSON.parse(row.document) as BakeEvent);
  }

  #findCommand(commandId: string): StoredCommand | undefined {
    const row = this.db
      .prepare('SELECT * FROM bake_commands WHERE command_id = ?')
      .get(commandId) as CommandRow | undefined;
    if (!row) return undefined;
    return {
      commandId: row.command_id,
      bakeId: row.bake_id,
      content: row.content,
      events: this.#events(row.bake_id, row.first_seq, row.last_seq),
    };
  }
}
