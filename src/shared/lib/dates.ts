// 날짜는 기기 시간대 기준 달력 날짜 'YYYY-MM-DD' 문자열로 다룬다.
// 계산은 UTC 자정으로 파싱해서 하므로 DST·시간대 영향을 받지 않는다.

export type DateStr = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(now = new Date()): DateStr {
  return toDateStr(now);
}

function utc(date: DateStr): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): DateStr {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// 연속 기록·달성률 계산은 렌더마다 같은 날짜로 addDays·weekday를 수천 번 부른다(문자열 파싱 + Date 생성).
// 결과를 문자열 키로 캐시한다. 크기가 넘치면 비운다(날짜는 날마다 조금씩만 바뀌어 다시 금방 찬다)
const CACHE_MAX = 50000;
const addCache = new Map<string, DateStr>();
const weekdayCache = new Map<DateStr, number>();

export function addDays(date: DateStr, n: number): DateStr {
  const key = `${date}|${n}`;
  let v = addCache.get(key);
  if (v === undefined) {
    if (addCache.size >= CACHE_MAX) addCache.clear();
    addCache.set(key, (v = fromUtc(utc(date) + n * 86400000)));
  }
  return v;
}

/** b - a (일) */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((utc(b) - utc(a)) / 86400000);
}

/** 0=일 ~ 6=토 */
export function weekday(date: DateStr): number {
  let v = weekdayCache.get(date);
  if (v === undefined) {
    if (weekdayCache.size >= CACHE_MAX) weekdayCache.clear();
    weekdayCache.set(date, (v = new Date(utc(date)).getUTCDay()));
  }
  return v;
}

/** 그 날짜가 속한 주의 일요일 */
export function weekStart(date: DateStr): DateStr {
  return addDays(date, -weekday(date));
}

/** 'N월 N주차'. 그 주(일~토) 목요일이 속한 달에서 몇 번째 목요일인지로 센다 */
export function weekOfMonthLabel(date: DateStr): string {
  const thu = addDays(weekStart(date), 4);
  // 연도도 목요일 기준(2027-01-01이 속한 주는 2026년 12월 5주차)
  return `${thu.slice(0, 4)}년 ${Number(thu.slice(5, 7))}월 ${Math.ceil(Number(thu.slice(8)) / 7)}주차`;
}

export function monthStart(date: DateStr): DateStr {
  return date.slice(0, 8) + '01';
}

export function addMonths(date: DateStr, n: number): DateStr {
  const [y, m] = date.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return fromUtc(d.getTime());
}

export function daysInMonth(date: DateStr): number {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUtc(utc(s)) === s;
}

export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** FR-06: 'M월 D일'. 올해가 아니면 앞에 연도를 붙인다 */
export function formatMD(date: DateStr, today: DateStr = todayStr()): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${date.slice(0, 4) === today.slice(0, 4) ? '' : `${y}년 `}${m}월 ${d}일`;
}

/** 'M월 D일 (요일)'. 올해가 아니면 연도를 붙인다 */
export function formatKo(date: DateStr, today: DateStr = todayStr()): string {
  return `${formatMD(date, today)} (${WEEKDAY_KO[weekday(date)]})`;
}

/** 시각(ISO). 'M월 D일 오후 3:05', 올해가 아니면 연도를 붙인다 */
export function formatDateTime(iso: string, today: DateStr = todayStr()): string {
  const t = new Date(iso);
  const h = t.getHours();
  return `${formatMD(toDateStr(t), today)} ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(t.getMinutes())}`;
}

/** 지난 시각(ISO)을 '방금 전', 'N분 전', 'N시간 전', 'N일 전'(달력 날짜 기준)으로. 30일이 넘으면 날짜 */
export function formatAgo(iso: string, now = new Date()): string {
  const t = new Date(iso);
  const min = Math.floor((now.getTime() - t.getTime()) / 60000);
  const days = diffDays(toDateStr(t), toDateStr(now));
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  if (days === 0) return `${Math.floor(min / 60)}시간 전`;
  if (days <= 30) return `${days}일 전`;
  return formatMD(toDateStr(t), toDateStr(now));
}
