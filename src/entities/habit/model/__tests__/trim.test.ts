import type { SQLiteDatabase } from 'expo-sqlite';
import { saveHabitTrimmingLogs } from '../repo';

// habit_logs 행과 habits 시작일만 흉내 내는 가짜 DB. SQL 앞부분으로 동작을 고른다
function fakeDb() {
  let logs = [
    { id: 'a', habit_id: 'h', log_date: '2026-11-10', is_done: 1, created_at: 't', updated_at: 't' },
    { id: 'b', habit_id: 'h', log_date: '2026-11-20', is_done: 1, created_at: 't', updated_at: 't' },
    { id: 'c', habit_id: 'x', log_date: '2026-11-10', is_done: 1, created_at: 't', updated_at: 't' },
  ];
  const habit = { start_date: '2026-11-01' };
  const db = {
    withTransactionAsync: async (fn: () => Promise<void>) => fn(),
    getAllAsync: async (_sql: string, id: string, date: string) => logs.filter((l) => l.habit_id === id && l.log_date < date),
    runAsync: async (sql: string, ...args: (string | number)[]) => {
      if (sql.startsWith('UPDATE habits SET name')) habit.start_date = String(args[3]);
      else if (sql.startsWith('UPDATE habits SET start_date')) habit.start_date = String(args[0]);
      else if (sql.startsWith('DELETE FROM habit_logs'))
        logs = logs.filter((l) => !(l.habit_id === args[0] && l.log_date < String(args[1])));
      else if (sql.startsWith('INSERT OR IGNORE INTO habit_logs')) {
        const [id, habit_id, log_date, is_done, created_at, updated_at] = args as [string, string, string, number, string, string];
        logs.push({ id, habit_id, log_date, is_done, created_at, updated_at });
      }
      return { changes: 1 };
    },
  };
  return { db: db as unknown as SQLiteDatabase, logs: () => logs, habit };
}

const input = {
  name: '체중측정',
  icon_key: 'ph:scales',
  icon_manual: true,
  start_date: '2026-11-15',
  frequency_type: 'daily' as const,
  weekdays: null,
  weekly_target: null,
};

test('새 시작일 이전 기록만 지우고, restore로 기록과 이전 시작일을 되돌린다', async () => {
  const { db, logs, habit } = fakeDb();
  const { removed, restore } = await saveHabitTrimmingLogs(db, 'h', input, '2026-11-01');
  expect(removed).toBe(1);
  expect(
    logs()
      .map((l) => l.id)
      .sort(),
  ).toEqual(['b', 'c']);
  expect(habit.start_date).toBe('2026-11-15');
  await restore();
  expect(
    logs()
      .map((l) => l.id)
      .sort(),
  ).toEqual(['a', 'b', 'c']);
  expect(habit.start_date).toBe('2026-11-01');
});
