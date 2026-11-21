import { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { cn, type DateStr, formatKo } from '@/shared/lib';
import { DatePicker, IconChip, Text } from '@/shared/ui';

/** 날짜 카드의 한 행(54pt). 아이콘 칩 + 이름 + 값, 누르면 아래에 달력이 펼쳐진다. divider는 아이콘 뒤부터 긋는 윗줄 */
export function DateRow({
  label,
  value,
  empty,
  fallback,
  min,
  range,
  onChange,
  tone = 'accent',
  divider,
  trailing,
}: {
  label: string;
  value: DateStr;
  empty: string;
  fallback: DateStr;
  min?: DateStr;
  /** 시작~종료 띠 */
  range?: { start: DateStr; end: DateStr };
  onChange: (d: DateStr) => void;
  tone?: 'accent' | 'neutral';
  divider?: boolean;
  trailing?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <View className={cn('h-[54px] flex-row items-center gap-3 pl-4', trailing ? 'pr-2' : 'pr-4')}>
        <IconChip name="calendar" tone={tone} />
        <Pressable
          onPress={() => (Keyboard.dismiss(), setOpen(!open))}
          className={cn(
            'h-full flex-1 flex-row items-center justify-between active:opacity-70',
            divider && 'border-t-[0.5px] border-separator',
            trailing ? 'pr-2' : '',
          )}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Text className="text-[16px] font-medium">{label}</Text>
          <Text className={cn('text-[16px]', !value && 'text-muted')}>{value ? formatKo(value) : empty}</Text>
        </Pressable>
        {trailing}
      </View>
      {open && (
        <DatePicker
          value={value}
          fallback={fallback}
          min={min}
          range={range}
          onChange={(d) => {
            setOpen(false);
            onChange(d);
          }}
        />
      )}
    </View>
  );
}
