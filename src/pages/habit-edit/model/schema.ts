import { z } from 'zod';
import { isDateStr } from '@/shared/lib';

const date = z.string().refine(isDateStr, '날짜 형식이 맞지 않아요.');

export const habitSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력해 주세요.').max(40, '이름은 40자까지 쓸 수 있어요.'),
    startDate: date,
    frequency: z.enum(['daily', 'weekdays', 'weekly']),
    weekdays: z.array(z.number().int().min(0).max(6)),
    weeklyTarget: z.number().int().min(1).max(6),
  })
  .refine((v) => v.frequency !== 'weekdays' || v.weekdays.length > 0, { path: ['weekdays'], message: '요일을 하나 이상 골라 주세요.' });
