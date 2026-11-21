import type { SQLiteDatabase } from 'expo-sqlite';
import { nowIso, uuidv7 } from '@/shared/db';
import { addDays, type DateStr, diffDays, todayStr } from '@/shared/lib';
import { earlyCompletion, nextOccurrence, type Repeat } from './tasks';

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: DateStr | null;
  end_date: DateStr | null;
  priority: number;
  completed_at: string | null;
  group_id: string | null;
  sort_order: number;
  /** 반복 규칙. 'daily' | 'weekly' | 'monthly', 반복 안 하면 null */
  rrule: Repeat | null;
  /** 일찍 완료해서 기간을 줄였을 때 원래 시작·종료일. 아니면 null */
  planned_start: DateStr | null;
  planned_end: DateStr | null;
};

export type Group = { id: string; name: string; sort_order: number };

export const EVENT_SQL = {
  events: 'SELECT * FROM events WHERE deleted_at IS NULL',
  groups: 'SELECT * FROM task_groups WHERE deleted_at IS NULL AND archived_at IS NULL ORDER BY sort_order, created_at',
};

// ── 일정·할 일 ──

export type EventInput = {
  title: string;
  description: string | null;
  start_date: DateStr | null;
  end_date: DateStr | null;
  priority: number;
  group_id: string | null;
  completed: boolean;
  rrule: Repeat | null;
};

/** 저장하고 할 일 id를 돌려준다 */
export async function saveEvent(
  db: SQLiteDatabase,
  id: string | null,
  e: EventInput,
  prevCompletedAt: string | null = null,
  today: DateStr = todayStr(),
) {
  const now = nowIso();
  const completedAt = e.completed ? (prevCompletedAt ?? now) : null;
  const rrule = e.start_date ? e.rrule : null;
  // 시트에서 지금 완료로 바꿨으면 목록 체크와 같게 기간을 완료일까지로 줄인다(FR-03)
  const early = e.completed && !prevCompletedAt ? earlyCompletion(e, today) : null;
  const start = early?.start_date ?? e.start_date;
  const end = early?.end_date ?? (e.start_date ? (e.end_date ?? e.start_date) : null);
  if (id) {
    // 완료를 풀거나 날짜를 직접 고쳤으면 원래 기간 기록은 지운다. 완료 상태로 다른 값만 고치면 그대로 둔다
    await db.runAsync(
      `UPDATE events SET title = ?, description = ?, start_date = ?, end_date = ?, priority = ?, group_id = ?,
       completed_at = ?, rrule = ?, updated_at = ?,
       planned_start = CASE WHEN ? THEN ? WHEN ? THEN planned_start ELSE NULL END,
       planned_end = CASE WHEN ? THEN ? WHEN ? THEN planned_end ELSE NULL END
       WHERE id = ?`,
      e.title,
      e.description,
      start,
      end,
      e.priority,
      e.group_id,
      completedAt,
      rrule,
      now,
      early ? 1 : 0,
      early?.planned_start ?? null,
      e.completed ? 1 : 0,
      early ? 1 : 0,
      early?.planned_end ?? null,
      e.completed ? 1 : 0,
      id,
    );
    return id;
  }
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM events');
  const newId = uuidv7();
  await db.runAsync(
    `INSERT INTO events (id, title, description, start_date, end_date, priority, group_id, completed_at, rrule, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newId,
    e.title,
    e.description,
    start,
    end,
    e.priority,
    e.group_id,
    completedAt,
    rrule,
    (max?.m ?? -1) + 1,
    now,
    now,
  );
  return newId;
}

/** 기간 길이를 유지한 채 시작일을 옮긴다 */
export async function moveDates(db: SQLiteDatabase, ev: Pick<EventRow, 'id' | 'start_date' | 'end_date'>, start: DateStr) {
  const span = ev.start_date && ev.end_date ? diffDays(ev.start_date, ev.end_date) : 0;
  await db.runAsync(
    'UPDATE events SET start_date = ?, end_date = ?, updated_at = ? WHERE id = ?',
    start,
    addDays(start, span),
    nowIso(),
    ev.id,
  );
}

/**
 * 완료 토글. 반복 할 일은 완료로 남기지 않고 다음 날짜로 옮긴다.
 * 옮겼으면 새 시작일을 돌려준다(되돌리기 안내용)
 */
export async function toggleEvent(db: SQLiteDatabase, ev: EventRow, today: DateStr): Promise<DateStr | null> {
  if (ev.rrule && ev.start_date && !ev.completed_at) {
    const next = nextOccurrence(ev.start_date, ev.rrule, today);
    await moveDates(db, ev, next);
    return next;
  }
  const now = nowIso();
  if (ev.completed_at) {
    // 완료를 풀면 줄였던 기간을 원래대로 되돌린다
    await db.runAsync(
      `UPDATE events SET completed_at = NULL, start_date = COALESCE(planned_start, start_date), end_date = COALESCE(planned_end, end_date),
       planned_start = NULL, planned_end = NULL, updated_at = ? WHERE id = ?`,
      now,
      ev.id,
    );
    return null;
  }
  const early = earlyCompletion(ev, today);
  await db.runAsync(
    'UPDATE events SET completed_at = ?, start_date = ?, end_date = ?, planned_start = ?, planned_end = ?, updated_at = ? WHERE id = ?',
    now,
    early?.start_date ?? ev.start_date,
    early?.end_date ?? ev.end_date,
    early?.planned_start ?? null,
    early?.planned_end ?? null,
    now,
    ev.id,
  );
  return null;
}

/** 지연된 할 일을 오늘로 옮긴다 */
export async function moveToToday(db: SQLiteDatabase, events: EventRow[], today: DateStr) {
  await db.withTransactionAsync(async () => {
    for (const ev of events) await moveDates(db, ev, today);
  });
}

export async function softDeleteEvent(db: SQLiteDatabase, id: string) {
  const now = nowIso();
  await db.runAsync('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function restoreEvent(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE events SET deleted_at = NULL, updated_at = ? WHERE id = ?', nowIso(), id);
}

/** E-11 순서 변경: 그룹 안 항목을 화면에 보이는 순서대로 다시 매긴다 */
export async function setOrder(db: SQLiteDatabase, ids: string[]) {
  await db.withTransactionAsync(async () => {
    for (const [i, id] of ids.entries()) await db.runAsync('UPDATE events SET sort_order = ? WHERE id = ?', i, id);
  });
}

export async function createGroup(db: SQLiteDatabase, name: string) {
  const id = uuidv7();
  const now = nowIso();
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM task_groups');
  await db.runAsync(
    'INSERT INTO task_groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    id,
    name,
    (max?.m ?? -1) + 1,
    now,
    now,
  );
  return id;
}

export async function renameGroup(db: SQLiteDatabase, id: string, name: string) {
  await db.runAsync('UPDATE task_groups SET name = ?, updated_at = ? WHERE id = ?', name, nowIso(), id);
}

/**
 * 그룹 삭제. 할 일은 지우지 않고 그룹 없음으로 옮긴다.
 * restore는 그룹을 되살리고, 삭제 직전 이 그룹에 있던 할 일 중 그 뒤 다른 그룹으로 옮기지 않은 것만 다시 연결한다
 */
export async function deleteGroup(db: SQLiteDatabase, id: string) {
  const now = nowIso();
  let ids: string[] = [];
  await db.withTransactionAsync(async () => {
    // 지운 할 일도 포함한다. 되살렸을 때 사라진 그룹을 가리키면 어느 목록에도 안 보인다
    ids = (await db.getAllAsync<{ id: string }>('SELECT id FROM events WHERE group_id = ?', id)).map((r) => r.id);
    await db.runAsync('UPDATE task_groups SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
    await db.runAsync('UPDATE events SET group_id = NULL, updated_at = ? WHERE group_id = ?', now, id);
  });
  return {
    restore: () =>
      db.withTransactionAsync(async () => {
        const at = nowIso();
        await db.runAsync('UPDATE task_groups SET deleted_at = NULL, updated_at = ? WHERE id = ?', at, id);
        for (const e of ids) {
          await db.runAsync('UPDATE events SET group_id = ?, updated_at = ? WHERE id = ? AND group_id IS NULL', id, at, e);
        }
      }),
  };
}
