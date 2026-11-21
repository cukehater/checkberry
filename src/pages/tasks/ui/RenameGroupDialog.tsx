import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { Input, showToast, Text, useOverlayShadow } from '@/shared/ui';

/**
 * 그룹 이름 입력 다이얼로그. showDialog는 입력칸을 받지 않아 할 일 탭 위에 겹쳐 그린다(DialogHost와 같은 카드 모양).
 * 키보드가 올라오면 카드가 키보드 위 남은 공간 가운데로 함께 올라간다
 */
export function RenameGroupDialog({ name, onSave, onClose }: { name: string; onSave: (name: string) => void; onClose: () => void }) {
  const shadow = useOverlayShadow();
  const [value, setValue] = useState(name);
  const [tries, setTries] = useState(0);
  const invalid = tries > 0 && !value.trim();
  const save = () => {
    setTries(tries + 1);
    if (!value.trim()) return showToast({ message: '그룹 이름을 입력해 주세요.', tone: 'error' });
    onSave(value.trim());
  };
  return (
    <Animated.View
      entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
      className="absolute inset-0 bg-backdrop"
    >
      <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="닫기" />
      {/* KeyboardAvoidingView는 className 대상이 아니라 style로 지정한다. 카드 밖을 누르면 뒤의 닫기 Pressable이 받는다 */}
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        pointerEvents="box-none"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <View className="w-full max-w-[340px] gap-3 rounded-3xl bg-elevated p-5" style={shadow} accessibilityViewIsModal>
          <Text className="text-[18px] leading-[26px] font-semibold">그룹 이름 바꾸기</Text>
          <Input
            value={value}
            onChangeText={setValue}
            placeholder="그룹 이름"
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={save}
            invalid={invalid}
            shakeKey={tries}
            accessibilityLabel="그룹 이름"
          />
          <View className="mt-1 flex-row justify-end gap-2">
            <Pressable
              onPress={onClose}
              className="h-11 items-center justify-center rounded-full bg-default px-4 active:opacity-70"
              accessibilityRole="button"
            >
              <Text className="text-[15px] font-semibold text-default-foreground">취소</Text>
            </Pressable>
            <Pressable
              onPress={save}
              className="h-11 items-center justify-center rounded-full bg-accent px-4 active:opacity-70"
              accessibilityRole="button"
            >
              <Text className="text-[15px] font-semibold text-accent-foreground">저장</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
