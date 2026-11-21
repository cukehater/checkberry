import { Button } from 'heroui-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { haptic, Icon, useColor } from '@/shared/ui';

/**
 * 오늘 할 일 카드 맨 아래 바로 추가 입력칸. 글자를 넣으면 추가 버튼이 나타나고 키보드의 완료로도 추가된다.
 * 추가 뒤에도 키보드를 열어 둬 연달아 적을 수 있다
 */
export function QuickAddRow({ onAdd, placeholder = '오늘 할 일 바로 추가' }: { onAdd: (title: string) => void; placeholder?: string }) {
  const c = useColor();
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed) return;
    haptic.check();
    onAdd(trimmed);
    setText('');
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
