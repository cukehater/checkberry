import type { SQLiteDatabase } from 'expo-sqlite';
import { toggleHabitLog } from '../repo';

// 실제 테이블 대신 (habit_id, log_date) 유일 제약만 흉내 내는 가짜 DB. 쿼리마다 한 틱 쉬어 연타 시 호출이 섞이게 한다
function fakeDb() {
  const rows = new Set<string>();
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const db = {
    runAsync: async (sql: string, ...args: string[]) => {
      await tick();
      const key = sql.startsWith('DELETE') ? `${args[0]}|${args[1]}` : `${args[1]}|${args[2]}`;
      if (sql.startsWith('DELETE')) return { changes: Number(rows.delete(key)) };
      if (rows.has(key)) throw new Error('UNIQUE constraint failed');
      rows.add(key);
      return { changes: 1 };
    },
  };
  return { db: db as unknown as SQLiteDatabase, rows };
}

test('연타해도 UNIQUE 오류 없이 누른 횟수만큼 번갈아 토글된다', async () => {
  const { db, rows } = fakeDb();
  const results = await Promise.all([1, 2, 3].map(() => toggleHabitLog(db, 'h', '2026-11-20')));
  expect(results).toEqual([true, false, true]);
  expect(rows.size).toBe(1);
});
