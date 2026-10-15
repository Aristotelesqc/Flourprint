import { describe, expect, it } from 'vitest';
import { staleReminderIds } from '../src/services/notifications';

describe('replacing reminders', () => {
  it('cancels only the pending reminders that the new set drops', () => {
    expect(staleReminderIds([1, 2, 3], [{ id: 2 }, { id: 4 }])).toEqual([1, 3]);
  });

  it('cancels every pending reminder when no bake needs one', () => {
    expect(staleReminderIds([5, 6], [])).toEqual([5, 6]);
  });

  it('cancels nothing when every pending reminder is kept', () => {
    expect(staleReminderIds([7], [{ id: 7 }, { id: 8 }])).toEqual([]);
  });
});
