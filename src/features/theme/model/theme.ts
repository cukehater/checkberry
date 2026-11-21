import type { SQLiteDatabase } from 'expo-sqlite';
import { Uniwind } from 'uniwind';
import { getSetting, setSetting } from '@/shared/db';

export type ThemeMode = 'system' | 'light' | 'dark';

const isMode = (v: string | null): v is ThemeMode => v === 'system' || v === 'light' || v === 'dark';

// Uniwind.setTheme이 Appearance.setColorScheme('light'|'dark'|'auto')까지 불러서 useColorScheme·네이티브 헤더도 같이 바뀐다
const apply = (mode: ThemeMode) => Uniwind.setTheme(mode);

/** 저장된 화면 모드를 적용한다. 앱 시작, 백업 복원 뒤 */
export async function loadTheme(db: SQLiteDatabase) {
  const v = await getSetting(db, 'theme');
  apply(isMode(v) ? v : 'system');
}

export async function saveTheme(db: SQLiteDatabase, mode: ThemeMode) {
  apply(mode);
  await setSetting(db, 'theme', mode);
}
