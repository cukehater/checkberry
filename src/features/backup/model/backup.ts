import type { SQLiteDatabase } from 'expo-sqlite';
import { nowIso, SCHEMA_VERSION, snapshot } from '@/shared/db';

// 5-2-1 백업 JSON. 부모 테이블이 먼저 오도록 순서를 지킨다(복원 시 FK)
const TABLES = ['settings', 'task_groups', 'habits', 'habit_logs', 'events'] as const;
// 오류 문구에 쓰는 표 이름
const TABLE_KO: Record<(typeof TABLES)[number], string> = {
  settings: '설정',
  task_groups: '그룹',
  habits: '습관',
  habit_logs: '습관 기록',
  events: '할 일',
};
type Tables = Record<(typeof TABLES)[number], Record<string, unknown>[]>;

export type Backup = {
  format: 'justdoit-backup';
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  tables: Tables;
};

export async function createBackup(db: SQLiteDatabase, appVersion: string): Promise<Backup> {
  const tables = {} as Tables;
  for (const t of TABLES) {
    const where = t === 'settings' || t === 'habit_logs' ? '' : ' WHERE deleted_at IS NULL';
    tables[t] = await db.getAllAsync(`SELECT * FROM ${t}${where}`);
  }
  // 고아 기록(삭제된 습관의 로그) 제외
  const habitIds = new Set(tables.habits.map((h) => h.id));
  tables.habit_logs = tables.habit_logs.filter((l) => habitIds.has(l.habit_id));
  return { format: 'justdoit-backup', schemaVersion: SCHEMA_VERSION, appVersion, exportedAt: nowIso(), tables };
}

/** 신뢰할 수 없는 파일 내용 → Backup. 형식이 틀리면 사용자에게 보일 메시지로 throw */
export function parseBackup(text: string): Backup {
  let data: Backup;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('백업 파일을 읽지 못했어요. checkberry에서 내보낸 JSON 파일인지 확인해 주세요.');
  }
  if (data?.format !== 'justdoit-backup' || typeof data.schemaVersion !== 'number' || typeof data.tables !== 'object') {
    throw new Error('checkberry에서 만든 백업 파일이 아니에요.');
  }
  if (data.schemaVersion > SCHEMA_VERSION) throw new Error('더 새 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 복원해 주세요.');
  // shortcut: schemaVersion이 낮은 백업 변환 함수는 스키마 v2가 생길 때 여기에 추가
  for (const t of TABLES) {
    if (!Array.isArray(data.tables[t])) throw new Error(`백업 파일에 ${TABLE_KO[t]} 데이터가 빠져 있어요.`);
  }
  return data;
}

export const backupCounts = (b: Backup) => ({
  habits: b.tables.habits.length,
  logs: b.tables.habit_logs.length,
  tasks: b.tables.events.length,
});

/** B-03: 현재 DB를 스냅샷으로 남기고 하나의 트랜잭션으로 통째로 교체 */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup) {
  await snapshot(db, 'restore');
  const columns: Record<string, Set<string>> = {};
  for (const t of TABLES) {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`);
    columns[t] = new Set(info.map((c) => c.name));
  }
  await db.withTransactionAsync(async () => {
    for (const t of [...TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      for (const row of backup.tables[t]) {
        // 컬럼 이름은 현재 스키마에 있는 것만 쓴다(파일 내용을 SQL에 그대로 넣지 않기 위해)
        const keys = Object.keys(row).filter((k) => columns[t].has(k));
        const values = keys.map((k) => row[k] as string | number | null);
        await db.runAsync(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, values);
      }
    }
  });
}
