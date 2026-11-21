import { tablesOf } from '../useQuery';

describe('tablesOf', () => {
  test('FROM과 JOIN 뒤 테이블을 소문자로 모은다', () => {
    expect([...tablesOf('SELECT * FROM events e JOIN Task_Groups g ON g.id = e.group_id')]).toEqual(['events', 'task_groups']);
  });

  test('설정 조회는 settings만 본다', () => {
    expect([...tablesOf("SELECT value FROM settings WHERE key = 'theme'")]).toEqual(['settings']);
  });
});
