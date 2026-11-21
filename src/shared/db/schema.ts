import type { SQLiteDatabase } from 'expo-sqlite';
import { snapshot } from './snapshot';

export const DB_NAME = 'justdoit.db';

// 5-2 데이터 모델. 날짜는 TEXT 'YYYY-MM-DD', 시각은 UTC ISO 8601, 불리언은 0/1.
// 스키마를 바꿀 때는 기존 항목을 고치지 말고 배열 끝에 추가한다. 인덱스+1 = PRAGMA user_version
const MIGRATIONS = [
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  CREATE TABLE task_groups (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE TABLE events (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    description TEXT,
    all_day INTEGER NOT NULL DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    start_at TEXT,
    end_at TEXT,
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    completed_at TEXT,
    group_id TEXT REFERENCES task_groups(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    rrule TEXT,
    source TEXT NOT NULL DEFAULT 'app',
    source_ref TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    CHECK (all_day = 0 OR start_at IS NULL),
    CHECK (end_date IS NULL OR (start_date IS NOT NULL AND end_date >= start_date))
  );
  CREATE INDEX events_start ON events(start_date);
  CREATE TABLE habits (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
    icon_key TEXT NOT NULL DEFAULT 'check',
    icon_manual INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    check_type TEXT NOT NULL DEFAULT 'boolean',
    unit TEXT,
    target_value REAL,
    frequency_type TEXT NOT NULL DEFAULT 'daily',
    weekdays TEXT,
    weekly_target INTEGER,
    start_date TEXT NOT NULL,
    archived_on TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    source_column TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE TABLE habit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits(id),
    log_date TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 1,
    value REAL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (habit_id, log_date)
  );
  `,
  // FR-03: 기간 할 일을 일찍 끝내면 기간을 완료일까지로 줄이고 원래 기간을 남긴다
  `
  ALTER TABLE events ADD COLUMN planned_start TEXT;
  ALTER TABLE events ADD COLUMN planned_end TEXT;
  `,
  // 중요도 5단계 → 3단계(낮음 1·보통 3·높음 5). 2는 낮음, 4는 높음으로 옮긴다
  `
  UPDATE events SET priority = CASE WHEN priority < 3 THEN 1 WHEN priority > 3 THEN 5 ELSE 3 END WHERE priority NOT IN (1, 3, 5);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** SQLiteProvider onInit. 마이그레이션마다 트랜잭션이라 실패하면 그 단계는 롤백된다 */
export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) throw new Error('앱보다 최신 버전에서 만든 데이터예요. 앱을 업데이트해 주세요.');
  if (current > 0 && current < SCHEMA_VERSION) await snapshot(db, `migrate-v${current}`);
  for (let v = current; v < SCHEMA_VERSION; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  // 5-2-1: 소프트 삭제 후 30일 지난 행은 영구 삭제
  await db.runAsync("DELETE FROM events WHERE deleted_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')");
}
