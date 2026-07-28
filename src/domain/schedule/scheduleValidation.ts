export interface ScheduleRow {
  id: string;
  startTime: string;
  endTime: string;
}

/**
 * Returns the ids of rows that are chronologically inconsistent within a
 * single day's ordered sequence: a row with a blank start/end (e.g. a time
 * input cleared mid-edit - "" sorts before every other row's time, which
 * would otherwise hide a blank *first* row's startTime from the
 * previous-row check below), a row whose own end isn't after its own
 * start, or one that starts before the previous row (in display order) has
 * ended. `rows` must already be in the display order being validated -
 * this doesn't sort them itself, since "does the current order make sense"
 * is exactly what's being checked.
 */
export function findInvalidScheduleRowIds(rows: ScheduleRow[]): Set<string> {
  const invalid = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.startTime || !row.endTime) invalid.add(row.id);
    if (row.endTime <= row.startTime) invalid.add(row.id);
    if (i > 0 && row.startTime < rows[i - 1].endTime) invalid.add(row.id);
  }

  return invalid;
}
