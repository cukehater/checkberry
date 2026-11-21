import { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { type DateStr, formatKo } from '@/shared/lib';
import { DatePicker, Icon, IconChip, Text, useCardStyle, useColor } from '@/shared/ui';

/** 날짜 카드(56pt). 중립 아이콘 칩 + 이름 + 값 + ›, 누르면 카드 안에 달력이 펼쳐진다 */
export function DateCard({ label, value, onChange }: { label: string; value: DateStr; onChange: (d: DateStr) => void }) {
  const c = useColor();
  const card = useCardStyle();
  const [open, setOpen] = useState(false);
  return (
    <View className="rounded-[20px] bg-card" style={card}>
      <Pressable
        onPress={() => (Keyboard.dismiss(), setOpen(!open))}
        className="h-14 flex-row items-center gap-3 px-4 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <IconChip name="calendar" tone="neutral" size={34} />
        <Text className="flex-1 text-[16px] font-medium">{label}</Text>
        <Text className="text-[16px]">{formatKo(value)}</Text>
        <Icon name="chevron-right" size={14} tint={c.sub} />
      </Pressable>
      {open && (
        <DatePicker
          value={value}
          fallback={value}
          onChange={(d) => {
            setOpen(false);
            onChange(d);
          }}
        />
      )}
    </View>
  );
}
