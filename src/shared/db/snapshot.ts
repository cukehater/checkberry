import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

const KEEP = 7;

/** 가져오기·복원·마이그레이션 직전 DB 사본을 앱 폴더에 남긴다(최근 7개). 기기 분실에는 무효 */
export async function snapshot(db: SQLiteDatabase, reason: string) {
  const dir = new Directory(Paths.document, 'snapshots');
  if (!dir.exists) dir.create();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = new File(dir, `${stamp}-${reason}.db`);
  file.create();
  file.write(await db.serializeAsync());

  const old = dir
    .list()
    .filter((f): f is File => f instanceof File && f.name.endsWith('.db'))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(KEEP);
  old.forEach((f) => f.delete());
}
