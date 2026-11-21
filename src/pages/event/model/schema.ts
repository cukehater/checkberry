import { z } from 'zod';
import { isDateStr } from '@/shared/lib';

const date = z.string().refine(isDateStr, '날짜 형식이 맞지 않아요.');

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, '제목을 입력해 주세요.').max(200, '제목은 200자까지 쓸 수 있어요.'),
    start: date.or(z.literal('')),
    end: date.or(z.literal('')),
  })
  .refine((v) => v.end === '' || (v.start !== '' && v.end >= v.start), {
    path: ['end'],
    message: '종료일은 시작일보다 앞설 수 없어요.',
  });
