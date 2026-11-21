import { Button } from 'heroui-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { PRIORITY_NAME, PRIORITY_VALUE } from '@/entities/event';
import { haptic, Icon, showMenu, useColor } from '@/shared/ui';

/**
 * 오늘 할 일 카드 맨 아래 바로 추가 입력칸. 추가 버튼이나 키보드 완료를 누르면 중요도 메뉴(높음·보통·낮음)가 뜨고,
 * 고르는 즉시 추가된다. 취소하면 적은 글자는 그대로 남는다. 추가 뒤에도 키보드를 열어 둬 연달아 적을 수 있다
 */
export function QuickAddRow({
  onAdd,
  placeholder = '오늘 할 일 바로 추가',
}: {
  onAdd: (title: string, priority: number) => void;
  placeholder?: string;
}) {
  const c = useColor();
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const add = (priority: number) => {
    haptic.check();
    onAdd(trimmed, priority);
    setText('');
  };
  const submit = () => {
    if (!trimmed) return;
    showMenu({
      title: '중요도를 골라 주세요',
      subtitle: trimmed,
      row: true,
      // 화살표 색은 목록 중요도 배지와 같다(높음 포인트, 보통 호박, 낮음 서리)
      items: [
        { icon: 'arrow-up', label: PRIORITY_NAME.high, tint: c.accentInk, onPress: () => add(PRIORITY_VALUE.high) },
        { icon: 'equal', label: PRIORITY_NAME.normal, tint: c.warningInk, onPress: () => add(PRIORITY_VALUE.normal) },
        { icon: 'arrow-down', label: PRIORITY_NAME.low, tint: c.frostInk, onPress: () => add(PRIORITY_VALUE.low) },
      ],
    });
  };

  return (
    <View className="flex-row items-center gap-3 pb-1.5">
      <View className="h-6 w-6 items-center justify-center rounded-lg border-[1.5px] border-dashed border-border-strong">
        <Icon name="plus" size={12} tint={c.sub} />
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={c.sub}
        selectionColor={c.accent}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={submit}
        accessibilityLabel={placeholder}
        className="h-11 min-w-0 flex-1 border-t-[0.5px] border-separator text-[16px] text-foreground"
      />
      {trimmed ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
          <Button size="sm" variant="primary" onPress={submit}>
            <Button.Label>추가</Button.Label>
          </Button>
        </Animated.View>
      ) : null}
    </View>
  );
}
