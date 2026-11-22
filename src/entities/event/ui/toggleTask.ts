import * as Haptics from 'expo-haptics';
import type { SQLiteDatabase } from 'expo-sqlite';
import { type DateStr, eulReul, formatKo } from '@/shared/lib';
import { confirm, showUndo } from '@/shared/ui';
import { type EventRow, moveDates, restoreEvent, softDeleteEvent, toggleEvent } from '../model/repo';

/** 할 일 완료 토글. 반복 할 일은 다음 날짜로 넘기고 되돌리기를 띄운다 */
export async function toggleTask(db: SQLiteDatabase, ev: EventRow, today: DateStr) {
  Haptics.selectionAsync();
  const next = await toggleEvent(db, ev, today);
  if (next && ev.start_date) {
    const prev = ev.start_date;
    // 원래 행의 기간 길이로 시작일만 되돌린다
    showUndo(`다음 반복: ${formatKo(next)}`, () => moveDates(db, ev, prev).then(() => {}), 'repeat');
  }
}

/** 할 일 삭제. 확인을 받은 뒤 soft delete하고 5초 실행취소를 띄운다 */
export async function removeTask(db: SQLiteDatabase, ev: EventRow) {
  const ok = await confirm({
    title: `${eulReul(ev.title)} 삭제할까요?`,
    confirmLabel: '삭제',
    destructive: true,
  });
  if (!ok) return;
  await softDeleteEvent(db, ev.id);
  showUndo('할 일을 삭제했어요', () => restoreEvent(db, ev.id));
}
