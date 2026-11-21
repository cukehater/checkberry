import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * 습관 아이콘 값(`habits.icon_key`). 지금은 `ph:<Phosphor 이름>` 하나다.
 * 예전 값 두 가지를 읽을 때와 정리할 때 Phosphor로 옮긴다: 접두사 없는 옛 키(`book`), Gravity 아이콘(`gi:<이름>`)
 */
export const ICON_PREFIX = 'ph:';
const DEFAULT_ICON = 'sparkle';

// 옛 키 → Phosphor. 화면 라벨(책·운동·체중…)의 뜻을 따른다
const LEGACY: Record<string, string> = {
  book: 'book-open',
  dumbbell: 'barbell',
  scale: 'scales',
  news: 'newspaper',
  music: 'music-note',
  moon: 'moon',
  water: 'drop',
  activity: 'person-simple-walk',
  pencil: 'pencil-simple',
  pill: 'pill',
  leaf: 'leaf',
  sun: 'sun',
  heart: 'heart',
  coffee: 'coffee',
  sparkle: 'sparkle',
  wallet: 'wallet',
  phone: 'device-mobile',
  check: DEFAULT_ICON,
};

// Gravity 이름 → Phosphor. 이름이 같은 아이콘(heart, moon, sun, pill, wallet, clock, gift, star, camera, palette, globe, medal…)은 그대로 쓴다
const GRAVITY: Record<string, string> = {
  pencil: 'pencil-simple',
  droplet: 'drop',
  cup: 'coffee',
  mug: 'coffee',
  'heart-pulse': 'heartbeat',
  persons: 'users',
  thunderbolt: 'lightning',
  sparkles: 'sparkle',
  'broom-motion': 'broom',
  'face-smile': 'smiley',
  cherry: 'cherries',
  paintbrush: 'paint-brush',
  brush: 'paint-brush',
  tv: 'television',
  'weight-hanging': 'barbell',
  'square-article': 'newspaper',
  smartphone: 'device-mobile',
};

/** 저장된 값 → Phosphor 이름. 모르는 이름은 렌더러가 기본 아이콘으로 그린다 */
export function habitIconName(value: string): string {
  if (value.startsWith(ICON_PREFIX) && value.length > ICON_PREFIX.length) return value.slice(ICON_PREFIX.length);
  if (value.startsWith('gi:') && value.length > 3) {
    const name = value.slice(3);
    return GRAVITY[name] ?? name;
  }
  return LEGACY[value] ?? DEFAULT_ICON;
}

/**
 * 옛 값(옛 키·gi:)으로 저장된 습관 아이콘과 최근 사용 목록을 ph:로 바꾼다. 여러 번 불러도 결과가 같다.
 * 앱 시작(DB 준비 직후)과 백업 복원 직후에 부른다(옛 백업을 복원하면 옛 값이 다시 들어온다)
 */
export async function normalizeHabitIcons(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ id: string; icon_key: string }>(
    `SELECT id, icon_key FROM habits WHERE icon_key NOT LIKE '${ICON_PREFIX}%'`,
  );
  const recent = await db.getFirstAsync<{ value: string | null }>("SELECT value FROM settings WHERE key = 'recentIcons'");
  // 최근 사용 목록은 접두사 없이 이름만 담는다. Phosphor로 바꾼 뒤에는 'icon_set' 표시를 남겨 다시 옮기지 않는다
  const migrated = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'icon_set'");
  if (!rows.length && migrated) return;
  await db.withTransactionAsync(async () => {
    for (const r of rows) await db.runAsync('UPDATE habits SET icon_key = ? WHERE id = ?', ICON_PREFIX + habitIconName(r.icon_key), r.id);
    if (!migrated) {
      let names: string[] = [];
      try {
        const list: unknown = JSON.parse(recent?.value ?? '[]');
        if (Array.isArray(list)) names = list.filter((n): n is string => typeof n === 'string').map((n) => habitIconName(`gi:${n}`));
      } catch {
        // 깨진 값이면 비운다
      }
      await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('recentIcons', ?)", JSON.stringify([...new Set(names)]));
      await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('icon_set', 'phosphor')");
    }
  });
}
