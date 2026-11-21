import type { SQLiteDatabase } from 'expo-sqlite';
import { toggleTask } from '../../ui/toggleTask';
import type { EventRow } from '../repo';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));
const undos: (() => void)[] = [];
jest.mock('@/shared/ui', () => ({ confirm: jest.fn(), showUndo: (_: string, undo: () => void) => undos.push(undo) }));

// 날짜 UPDATE(start_date, end_date)만 기록하는 가짜 DB
function fakeDb() {
  const dates: [string, string][] = [];
  const db = {
    runAsync: async (sql: string, ...args: string[]) => {
      if (sql.startsWith('UPDATE events SET start_date')) dates.push([args[0], args[1]]);
      return { changes: 1 };
    },
  };
  return { db: db as unknown as SQLiteDatabase, dates };
}

const task = (over: Partial<EventRow>): EventRow => ({
  id: 'e',
  title: '청소',
  description: null,
  start_date: null,
  end_date: null,
  priority: 3,
  completed_at: null,
  group_id: null,
  sort_order: 0,
  rrule: null,
  planned_start: null,
  planned_end: null,
  ...over,
});

test('기간 반복 할 일을 체크한 뒤 실행취소하면 원래 기간으로 돌아온다', async () => {
  const { db, dates } = fakeDb();
  await toggleTask(db, task({ start_date: '2026-11-20', end_date: '2026-11-22', rrule: 'weekly' }), '2026-11-21');
  expect(dates).toEqual([['2026-11-27', '2026-11-29']]);
  await undos.pop()!();
  expect(dates[1]).toEqual(['2026-11-20', '2026-11-22']);
});
