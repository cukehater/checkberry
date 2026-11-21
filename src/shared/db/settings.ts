import type { SQLiteDatabase } from 'expo-sqlite';

export async function getSetting(db: SQLiteDatabase, key: string) {
  return (await db.getFirstAsync<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', key))?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string | null) {
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}
