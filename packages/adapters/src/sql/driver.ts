/**
 * Minimal SQL driver used by the shared SQLite stores (docs/contracts/persistence.md). Node and
 * Capacitor provide a `RawSql`; `serializedDriver` turns it into a `SqlDriver` whose operations
 * never interleave on the connection.
 */

export type SqlValue = string | number | null;

export interface SqlExecutor {
  /** Runs one or more statements without parameters. */
  execute(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  query<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
}

export interface SqlDriver extends SqlExecutor {
  /** Runs `work` in one transaction (BEGIN IMMEDIATE where supported), rolled back on error. */
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

/** What a platform driver must provide. Calls are made one at a time. */
export interface RawSql extends SqlExecutor {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export const serializedDriver = (raw: RawSql): SqlDriver => {
  let tail: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.then(work, work);
    tail = result.catch(() => undefined);
    return result;
  };
  return {
    execute: (sql) => exclusive(() => raw.execute(sql)),
    run: (sql, params) => exclusive(() => raw.run(sql, params)),
    query: <T>(sql: string, params?: readonly SqlValue[]) =>
      exclusive(() => raw.query<T>(sql, params)),
    transaction: (work) =>
      exclusive(async () => {
        await raw.begin();
        try {
          const result = await work(raw);
          await raw.commit();
          return result;
        } catch (error) {
          await raw.rollback();
          throw error;
        }
      }),
  };
};
