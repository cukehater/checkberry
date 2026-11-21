import { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { cn, type DateStr, formatKo } from '@/shared/lib';
import { DatePicker, Icon, IconChip, Text, useColor } from '@/shared/ui';

/**
 * 날짜 카드의 한 행(56pt). 중립 아이콘 칩 + 이름 + 값 + 28pt 꼬리 칸(›, onClear가 있으면 ×). 꼬리 칸이 모든 행에 있어 값 오른쪽 끝이 맞는다.
 * 누르면 아래에 달력이 펼쳐진다. divider는 아이콘 뒤부터 긋는 윗줄
 */
export function DateRow({
  label,
  value,
  empty,
  fallback,
  min,
  range,
  onChange,
  onClear,
  divider,
}: {
  label: string;
  value: DateStr;
  empty: string;
  fallback: DateStr;
  min?: DateStr;
  /** 시작~종료 띠 */
  range?: { start: DateStr; end: DateStr };
  onChange: (d: DateStr) => void;
  /** 값을 지우는 × (종료일) */
  onClear?: () => void;
  divider?: boolean;
}) {
  const c = useColor();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <View className="h-14 flex-row items-center gap-3 pr-3 pl-4">
        <IconChip name="calendar" tone="neutral" size={34} />
        <View className={cn('h-full flex-1 flex-row items-center gap-1.5', divider && 'border-t-[0.5px] border-separator')}>
          <Pressable
            onPress={() => (Keyboard.dismiss(), setOpen(!open))}
            className="h-full flex-1 flex-row items-center justify-between active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`${label} ${value ? formatKo(value) : empty}`}
          >
            <Text className="text-[16px] font-medium">{label}</Text>
            <Text className={cn('text-[16px]', !value && 'text-muted')}>{value ? formatKo(value) : empty}</Text>
          </Pressable>
          {onClear ? (
            <Pressable
              onPress={onClear}
              hitSlop={8}
              className="h-7 w-7 items-center justify-center rounded-full bg-default active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={`${label} 지우기`}
            >
              <Icon name="close" size={12} tint={c.sub} />
            </Pressable>
          ) : (
            <View className="h-7 w-7 items-center justify-center">
              <Icon name="chevron-right" size={14} tint={c.sub} />
            </View>
          )}
        </View>
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
