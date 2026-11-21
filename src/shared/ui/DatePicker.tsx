import { useCalendar } from '@marceloterreiro/flash-calendar';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addMonths, type DateStr, monthStart, WEEKDAY_KO } from '../lib/dates';
import { useToday } from '../lib/useToday';
import { cn } from '../lib/utils';
import { IconButton } from './components';
import { Text } from './primitives';

/**
 * 카드 안에 펼치는 달력(flash-calendar의 useCalendar로 격자만 받고 칸은 직접 그린다).
 * 고른 날은 베리 원, 오늘은 베리 soft 원, range가 있으면 시작~종료를 연한 베리 띠로 잇는다. 일요일은 빨강.
 */
export function DatePicker({
  value,
  fallback,
  min,
  range,
  onChange,
}: {
  value: DateStr;
  /** value가 비었을 때 처음 보여 줄 달 */
  fallback: DateStr;
  min?: DateStr;
  range?: { start: DateStr; end: DateStr };
  onChange: (d: DateStr) => void;
}) {
  const today = useToday();
  const [month, setMonth] = useState(monthStart(value || fallback));
  const { weeksList } = useCalendar({ calendarMonthId: month, calendarMinDateId: min });
  const [y, m] = month.split('-').map(Number);
  const band = range && range.start < range.end ? range : null;

  return (
    <View className="px-3 pb-3">
      <View className="flex-row items-center justify-between pb-1 pl-2">
        <Text className="text-[16px] font-semibold">{`${y}년 ${m}월`}</Text>
        <View className="flex-row gap-1">
          <IconButton name="chevron-left" size={16} onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="이전 달" />
          <IconButton name="chevron-right" size={16} onPress={() => setMonth(addMonths(month, 1))} accessibilityLabel="다음 달" />
        </View>
      </View>
      <View className="flex-row">
        {WEEKDAY_KO.map((w, i) => (
          <Text
            key={w}
            className={cn('h-7 flex-1 text-center text-[13px] font-medium text-muted', i === 0 && 'text-danger-soft-foreground')}
          >
            {w}
          </Text>
        ))}
      </View>
      {weeksList.map((week) => (
        <View key={week[0].id} className="flex-row">
          {week.map((d) => {
            if (d.isDifferentMonth) return <View key={d.id} className="h-10 flex-1" />;
            const inBand = !!band && d.id >= band.start && d.id <= band.end;
            // 범위 양 끝은 둘 다 베리 원
            const on = d.id === value || (inBand && (d.id === band?.start || d.id === band?.end));
            const isToday = d.id === today;
            return (
              <Pressable
                key={d.id}
                disabled={d.isDisabled}
                onPress={() => onChange(d.id)}
                className="h-10 flex-1 items-center justify-center"
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: d.isDisabled }}
                accessibilityLabel={`${m}월 ${d.displayLabel}일 ${WEEKDAY_KO[d.date.getDay()]}요일${isToday ? ', 오늘' : ''}`}
              >
                {inBand && (
                  <View
                    className={cn(
                      'absolute inset-y-0.5 bg-accent-soft',
                      d.id === band?.start ? 'left-1/2' : 'left-0',
                      d.id === band?.end ? 'right-1/2' : 'right-0',
                    )}
                  />
                )}
                <View
                  className={cn(
                    'h-9 w-9 items-center justify-center rounded-full',
                    on ? 'bg-accent' : isToday && !inBand ? 'bg-accent-soft' : '',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[16px] tabular-nums',
                      on && 'font-semibold text-accent-foreground',
                      !on && isToday && 'font-semibold text-accent-soft-foreground',
                      !on && !isToday && d.date.getDay() === 0 && 'text-danger-soft-foreground',
                      d.isDisabled && 'opacity-30',
                    )}
                  >
                    {d.displayLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
