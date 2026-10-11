/** Creation dates written by TOST at the top of its notes, in French, local time. */

const MONTHS: Readonly<Record<string, number>> = {
  'janv.': 1,
  'févr.': 2,
  mars: 3,
  'avr.': 4,
  mai: 5,
  juin: 6,
  'juil.': 7,
  août: 8,
  'sept.': 9,
  'oct.': 10,
  'nov.': 11,
  'déc.': 12,
};

// "31 janv. 2025 @ 11:40:31" or "30 déc. 2024 @ 15 h 37 min 58 s"
const DATE =
  /^(\d{1,2}) (\S+) (\d{4}) @ (?:(\d{1,2}):(\d{2}):(\d{2})|(\d{1,2}) h (\d{1,2}) min (\d{1,2}) s)$/;

/** Offset of a time zone from UTC at an instant, in milliseconds. */
const offsetAt = (utcMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return local - utcMs;
};

/** Converts a wall-clock time in a time zone to a UTC instant string. */
export const zonedToUtc = (
  fields: readonly [number, number, number, number, number, number],
  timeZone: string,
): string => {
  const [year, month, day, hour, minute, second] = fields;
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = wall - offsetAt(wall, timeZone);
  utc = wall - offsetAt(utc, timeZone);
  return new Date(utc).toISOString();
};

/** The creation date on the first line of a note, and the rest of the note, if any. */
export const parseNoteDate = (
  text: string,
  timeZone: string,
): { instant: string; rest?: string } | undefined => {
  const [first = '', ...others] = text.split('\n');
  const match = DATE.exec(first.trim());
  if (!match) return undefined;
  const month = MONTHS[match[2] ?? ''];
  if (month === undefined) return undefined;
  const pick = (a?: string, b?: string) => Number(a ?? b);
  const instant = zonedToUtc(
    [
      Number(match[3]),
      month,
      Number(match[1]),
      pick(match[4], match[7]),
      pick(match[5], match[8]),
      pick(match[6], match[9]),
    ],
    timeZone,
  );
  const rest = others.join('\n').trim();
  return rest ? { instant, rest } : { instant };
};
