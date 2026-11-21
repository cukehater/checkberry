import { addDatabaseChangeListener, useSQLiteContext, type SQLiteBindValue } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/** DB가 바뀌면 다시 읽는 조회 훅. 가져오기처럼 한 번에 많은 행이 바뀌어도 한 틱에 한 번만 다시 읽는다 */
export function useQuery<T>(sql: string, params: SQLiteBindValue[] = []): T[] {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<T[]>([]);
  const key = JSON.stringify(params);

  useEffect(() => {
    let alive = true;
    let pending = false;
    const load = () => {
      pending = false;
      db.getAllAsync<T>(sql, params).then((r) => alive && setRows(r));
    };
    load();
    const sub = addDatabaseChangeListener(() => {
      if (pending) return;
      pending = true;
      setTimeout(load, 0);
    });
    return () => {
      alive = false;
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, sql, key]);

  return rows;
}
