import type { SQLiteDatabase } from 'expo-sqlite';
import { nowIso, uuidv7 } from '@/shared/db';
import type { DateStr } from '@/shared/lib';

export type Habit = {
  id: string;
  name: string;
  icon_key: string;
  icon_manual: number;
  start_date: DateStr;
  archived_on: DateStr | null;
  sort_order: number;
  frequency_type: string;
  weekdays: string | null;
  weekly_target: number | null;
};

export type HabitLog = { habit_id: string; log_date: DateStr };

export const HABIT_SQL = {
  activeHabits: 'SELECT * FROM habits WHERE deleted_at IS NULL AND archived_on IS NULL ORDER BY sort_order, created_at',
  allHabits: 'SELECT * FROM habits WHERE deleted_at IS NULL ORDER BY sort_order, created_at',
  logsBetween: 'SELECT habit_id, log_date FROM habit_logs WHERE is_done = 1 AND log_date BETWEEN ? AND ?',
  logsOf: 'SELECT habit_id, log_date FROM habit_logs WHERE is_done = 1 AND habit_id = ?',
};

// ── 습관 ──

// 토글은 '지우고, 지운 게 없으면 넣기' 두 단계라 빠르게 연타하면 두 호출이 섞여 같은 행을 두 번 넣는다(UNIQUE 위반).
// 호출을 한 줄로 세워 앞 토글이 끝난 뒤 다음 토글을 한다
let queue: Promise<unknown> = Promise.resolve();

export function toggleHabitLog(db: SQLiteDatabase, habitId: string, date: DateStr): Promise<boolean> {
  const run = queue.then(() => toggleNow(db, habitId, date));
  queue = run.catch(() => {});
  return run;
}

async function toggleNow(db: SQLiteDatabase, habitId: string, date: DateStr) {
  // 행이 없으면 미완료(5-2). 체크 해제는 행을 지운다
  const del = await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?', habitId, date);
  if (del.changes) return false;
  const now = nowIso();
  await db.runAsync(
    'INSERT INTO habit_logs (id, habit_id, log_date, is_done, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
    uuidv7(),
    habitId,
    date,
    now,
    now,
  );
  return true;
}

export type HabitInput = {
  name: string;
  icon_key: string;
  icon_manual: boolean;
  start_date: DateStr;
  frequency_type: 'daily' | 'weekdays' | 'weekly';
  weekdays: string | null;
  weekly_target: number | null;
};

export async function saveHabit(db: SQLiteDatabase, id: string | null, h: HabitInput) {
  const now = nowIso();
  if (id) {
    await db.runAsync(
      `UPDATE habits SET name = ?, icon_key = ?, icon_manual = ?, start_date = ?, frequency_type = ?, weekdays = ?, weekly_target = ?,
       updated_at = ? WHERE id = ?`,
      h.name,
      h.icon_key,
      Number(h.icon_manual),
      h.start_date,
      h.frequency_type,
      h.weekdays,
      h.weekly_target,
      now,
      id,
    );
    return id;
  }
  const newId = uuidv7();
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM habits');
  await db.runAsync(
    `INSERT INTO habits (id, name, icon_key, icon_manual, start_date, frequency_type, weekdays, weekly_target, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newId,
    h.name,
    h.icon_key,
    Number(h.icon_manual),
    h.start_date,
    h.frequency_type,
    h.weekdays,
    h.weekly_target,
    (max?.m ?? -1) + 1,
    now,
    now,
  );
  return newId;
}

/** 습관 순서(오늘 탭·습관 탭이 같이 쓴다). 이 순서대로 sort_order를 다시 매긴다 */
export async function setHabitOrder(db: SQLiteDatabase, ids: string[]) {
  await db.withTransactionAsync(async () => {
    for (const [i, id] of ids.entries()) await db.runAsync('UPDATE habits SET sort_order = ? WHERE id = ?', i, id);
  });
}

/** H-02: 보관일부터 분모에서 빠지고 과거 기록은 남는다. null이면 보관 해제 */
export async function setHabitArchived(db: SQLiteDatabase, id: string, archivedOn: DateStr | null) {
  await db.runAsync('UPDATE habits SET archived_on = ?, updated_at = ? WHERE id = ?', archivedOn, nowIso(), id);
}

export async function softDeleteHabit(db: SQLiteDatabase, id: string) {
  const now = nowIso();
  await db.runAsync('UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function restoreHabit(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE habits SET deleted_at = NULL, updated_at = ? WHERE id = ?', nowIso(), id);
}

type HabitLogRow = { id: string; habit_id: string; log_date: DateStr; is_done: number; created_at: string; updated_at: string };

/**
 * 시작일을 뒤로 옮길 때: 습관을 저장하고 새 시작일보다 앞선 기록을 한 트랜잭션에서 지운다.
 * restore()는 지운 기록과 이전 시작일을 함께 되돌린다(실행취소)
 */
export async function saveHabitTrimmingLogs(db: SQLiteDatabase, id: string, h: HabitInput, previousStart: DateStr) {
  let removed: HabitLogRow[] = [];
  await db.withTransactionAsync(async () => {
    await saveHabit(db, id, h);
    removed = await db.getAllAsync<HabitLogRow>(
      'SELECT id, habit_id, log_date, is_done, created_at, updated_at FROM habit_logs WHERE habit_id = ? AND log_date < ?',
      id,
      h.start_date,
    );
    await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND log_date < ?', id, h.start_date);
  });
  return {
    removed: removed.length,
    restore: () =>
      db.withTransactionAsync(async () => {
        for (const l of removed) {
          await db.runAsync(
            'INSERT OR IGNORE INTO habit_logs (id, habit_id, log_date, is_done, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            l.id,
            l.habit_id,
            l.log_date,
            l.is_done,
            l.created_at,
            l.updated_at,
          );
        }
        await db.runAsync('UPDATE habits SET start_date = ?, updated_at = ? WHERE id = ?', previousStart, nowIso(), id);
      }),
  };
}
