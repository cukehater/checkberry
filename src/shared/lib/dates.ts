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

export function addDays(date: DateStr, n: number): DateStr {
  return fromUtc(utc(date) + n * 86400000);
}

/** b - a (일) */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((utc(b) - utc(a)) / 86400000);
}

/** 0=일 ~ 6=토 */
export function weekday(date: DateStr): number {
  return new Date(utc(date)).getUTCDay();
}

/** 그 날짜가 속한 주의 일요일 */
export function weekStart(date: DateStr): DateStr {
  return addDays(date, -weekday(date));
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
