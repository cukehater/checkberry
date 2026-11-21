import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizeHabitIcons } from '@/entities/habit';
import { nowIso, setSetting } from '@/shared/db';
import { formatDateTime, todayStr } from '@/shared/lib';
import { confirm, notify } from '@/shared/ui';
import { backupCounts, createBackup, parseBackup, restoreBackup } from './backup';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';

async function share(name: string, content: string, mimeType: string, UTI: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: name });
}

const stamp = () => todayStr().replace(/-/g, '');

/** B-02 백업 파일 만들기 → 공유 시트 */
export async function exportBackup(db: SQLiteDatabase) {
  const backup = await createBackup(db, Constants.expoConfig?.version ?? '1.0.0');
  await share(`justdoit-backup-${stamp()}.json`, JSON.stringify(backup), 'application/json', 'public.json');
  // 공유 시트를 닫았는지 저장했는지 알 수 없어 파일을 만든 시각을 기록한다
  await setSetting(db, 'last_backup_at', nowIso());
}

/** B-03 복원: 파일 선택 → 건수 미리보기 → 확인 → 교체. 완료되면 true */
export async function pickAndRestore(db: SQLiteDatabase): Promise<boolean> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
  if (picked.canceled) return false;
  let backup;
  try {
    backup = parseBackup(await new File(picked.assets[0].uri).text());
  } catch (e) {
    notify('복원할 수 없어요', (e as Error).message);
    return false;
  }
  const c = backupCounts(backup);
  const ok = await confirm({
    title: '지금 데이터를 백업 내용으로 바꿀까요?',
    message: `습관 ${c.habits}개 · 기록 ${c.logs}개 · 할 일 ${c.tasks}개\n백업 시각: ${formatDateTime(backup.exportedAt)}\n\n바꾸기 전 데이터는 기기 안에 따로 보관해 둬요.`,
    confirmLabel: '바꾸기',
    destructive: true,
  });
  if (!ok) return false;
  try {
    await restoreBackup(db, backup);
    // 예전 백업의 습관 아이콘 값(옛 키·Gravity)을 Phosphor로 옮긴다
    await normalizeHabitIcons(db);
    // 다른 기기 백업에 온보딩 값이 없어도 복원했으면 온보딩은 끝난 것
    await setSetting(db, 'onboarded', '1');
    return true;
  } catch (e) {
    notify('복원하지 못했어요', `데이터는 그대로예요.\n${(e as Error).message}`);
    return false;
  }
}

export async function exportTasksCsv(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT e.title AS 제목, e.start_date AS 시작일, e.end_date AS 종료일, CASE WHEN e.priority < 3 THEN '낮음' WHEN e.priority > 3 THEN '높음' ELSE '보통' END AS 중요도,
       CASE WHEN e.completed_at IS NULL THEN 'No' ELSE 'Yes' END AS 완료, g.name AS 그룹, e.description AS 내용
     FROM events e LEFT JOIN task_groups g ON g.id = e.group_id
     WHERE e.deleted_at IS NULL ORDER BY e.start_date, e.sort_order`,
  );
  await share(`justdoit-tasks-${stamp()}.csv`, '﻿' + Papa.unparse(rows), 'text/csv', 'public.comma-separated-values-text');
}

export async function exportHabitsCsv(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT l.log_date AS 날짜, h.name AS 습관, 'Yes' AS 완료
     FROM habit_logs l JOIN habits h ON h.id = l.habit_id
     WHERE h.deleted_at IS NULL AND l.is_done = 1 ORDER BY l.log_date, h.sort_order`,
  );
  await share(`justdoit-habits-${stamp()}.csv`, '﻿' + Papa.unparse(rows), 'text/csv', 'public.comma-separated-values-text');
}
