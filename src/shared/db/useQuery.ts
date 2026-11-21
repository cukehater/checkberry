import { addDatabaseChangeListener, useSQLiteContext, type SQLiteBindValue } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/** SQL이 읽는 테이블 이름(FROM·JOIN 뒤). 이 테이블이 바뀔 때만 다시 읽는다 */
export function tablesOf(sql: string): Set<string> {
  return new Set([...sql.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()));
}

/**
 * DB가 바뀌면 다시 읽는 조회 훅. 가져오기처럼 한 번에 많은 행이 바뀌어도 한 틱에 한 번만 다시 읽는다.
 * 탭이 모두 마운트돼 있어 체크 한 번에 모든 조회가 깨어나므로, 읽는 테이블이 바뀔 때만 다시 읽고
 * 결과가 같으면 상태를 바꾸지 않아 리렌더를 막는다
 */
export function useQuery<T>(sql: string, params: SQLiteBindValue[] = []): T[] {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<T[]>([]);
  const key = JSON.stringify(params);

  useEffect(() => {
    let alive = true;
    let pending = false;
    let last = '';
    const tables = tablesOf(sql);
    const load = () => {
      pending = false;
      db.getAllAsync<T>(sql, params).then((r) => {
        const json = JSON.stringify(r);
        if (!alive || json === last) return;
        last = json;
        setRows(r);
      });
    };
    load();
    const sub = addDatabaseChangeListener((e) => {
      if (pending || !tables.has(e.tableName.toLowerCase())) return;
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
