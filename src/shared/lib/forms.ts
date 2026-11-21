import type { z } from 'zod';

/** 필드별 첫 오류 메시지. 통과하면 빈 객체 */
export function fieldErrors<T extends z.ZodType>(schema: T, value: z.input<T>): Partial<Record<keyof z.input<T>, string>> {
  const r = schema.safeParse(value);
  const out: Record<string, string> = {};
  if (!r.success) for (const i of r.error.issues) out[String(i.path[0])] ??= i.message;
  return out as Partial<Record<keyof z.input<T>, string>>;
}
