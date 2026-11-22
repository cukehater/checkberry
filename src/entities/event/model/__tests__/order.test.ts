import { byManualOrder, byTodayOrder } from '../tasks';

const t = (id: string, o: { sort_order: number; today_order?: number; done?: boolean }) => ({
  id,
  start_date: null,
  end_date: null,
  completed_at: o.done ? 'x' : null,
  priority: 3,
  sort_order: o.sort_order,
  today_order: o.today_order ?? 0,
});

describe('손으로 정한 순서', () => {
  test('할 일 탭: 미완료 먼저, 그다음 sort_order(중요도는 보지 않는다)', () => {
    const list = [t('a', { sort_order: 0, done: true }), t('b', { sort_order: 2 }), t('c', { sort_order: 1 })].sort(byManualOrder);
    expect(list.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  test('오늘 탭: today_order, 같으면 sort_order', () => {
    const list = [
      t('a', { sort_order: 0, today_order: 2 }),
      t('b', { sort_order: 5, today_order: 1 }),
      t('c', { sort_order: 1, today_order: 2 }),
      t('d', { sort_order: 0, today_order: 0, done: true }),
    ].sort(byTodayOrder);
    expect(list.map((x) => x.id)).toEqual(['b', 'a', 'c', 'd']);
  });
});
