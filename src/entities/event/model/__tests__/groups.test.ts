import type { SQLiteDatabase } from 'expo-sqlite';
import { deleteGroup, renameGroup } from '../repo';

// 그룹(deleted_at, name)과 할 일(group_id)만 흉내 내는 가짜 DB. repo가 쓰는 문장만 알아듣는다
function fakeDb(events: Record<string, string | null>) {
  const groups: Record<string, { name: string; deleted_at: string | null }> = {
    a: { name: '집', deleted_at: null },
    b: { name: '회사', deleted_at: null },
  };
  const db = {
    withTransactionAsync: async (fn: () => Promise<void>) => fn(),
    getAllAsync: async (sql: string, gid: string) => {
      if (!sql.startsWith('SELECT id FROM events WHERE group_id = ?')) throw new Error(sql);
      return Object.keys(events)
        .filter((id) => events[id] === gid)
        .map((id) => ({ id }));
    },
    runAsync: async (sql: string, ...args: string[]) => {
      if (sql.startsWith('UPDATE task_groups SET name')) groups[args[2]].name = args[0];
      else if (sql.startsWith('UPDATE task_groups SET deleted_at = ?')) groups[args[2]].deleted_at = args[0];
      else if (sql.startsWith('UPDATE task_groups SET deleted_at = NULL')) groups[args[1]].deleted_at = null;
      else if (sql.startsWith('UPDATE events SET group_id = NULL')) {
        for (const id in events) if (events[id] === args[1]) events[id] = null;
      } else if (sql.startsWith('UPDATE events SET group_id = ?') && sql.includes('group_id IS NULL')) {
        if (events[args[2]] === null) events[args[2]] = args[0];
      } else throw new Error(sql);
      return { changes: 1 };
    },
  };
  return { db: db as unknown as SQLiteDatabase, groups, events };
}

test('그룹을 지우면 그 그룹 할 일만 그룹 없음으로 옮기고, 되돌리면 원래 그룹으로 돌아온다', async () => {
  const { db, groups, events } = fakeDb({ e1: 'a', e2: 'a', e3: 'b', e4: null });
  const { restore } = await deleteGroup(db, 'a');
  expect(groups.a.deleted_at).not.toBeNull();
  expect(events).toEqual({ e1: null, e2: null, e3: 'b', e4: null });

  await restore();
  expect(groups.a.deleted_at).toBeNull();
  // 원래 그룹 없던 e4는 그대로, 다른 그룹 e3도 그대로
  expect(events).toEqual({ e1: 'a', e2: 'a', e3: 'b', e4: null });
});

test('되돌리기 전에 다른 그룹으로 옮긴 할 일은 그대로 둔다', async () => {
  const { db, events } = fakeDb({ e1: 'a', e2: 'a' });
  const { restore } = await deleteGroup(db, 'a');
  events.e2 = 'b';
  await restore();
  expect(events).toEqual({ e1: 'a', e2: 'b' });
});

test('이름 바꾸기', async () => {
  const { db, groups } = fakeDb({});
  await renameGroup(db, 'b', '사무실');
  expect(groups.b.name).toBe('사무실');
});
