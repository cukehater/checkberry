import { type Href, router, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { showDialog } from './dialog';
import { Text } from './primitives';

/**
 * 시트 닫기 보호. 폼 값(snapshot)이 처음과 달라졌으면 스와이프·취소로 닫을 때 확인을 받는다.
 * ready는 편집할 값을 다 불러온 뒤 true로 준다(그때의 값이 기준이 된다). 저장·삭제 뒤에는 close()로 닫는다
 */
export function useSheetGuard(snapshot: string, ready: boolean) {
  const [base, setBase] = useState<string | null>(null);
  // 닫는 중이면 true, 닫은 뒤 이동할 화면이 있으면 그 주소
  const [closing, setClosing] = useState<Href | boolean>(false);
  // 값을 다 불러온 첫 렌더에서 기준을 잡는다(렌더 중 상태 조정)
  if (ready && base === null) setBase(snapshot);
  useEffect(() => {
    if (!closing) return;
    router.back();
    if (closing !== true) router.navigate(closing);
  }, [closing]);
  const dirty = base !== null && snapshot !== base && !closing;
  // 버리기를 고르면 보호를 끈 다음 닫는다(보호가 켜진 채 다시 닫으면 확인창이 또 뜬다)
  usePreventRemove(dirty, () =>
    showDialog({
      title: '바꾼 내용을 버릴까요?',
      message: '저장하지 않으면 사라져요.',
      actions: [
        { label: '계속 편집', style: 'cancel' },
        { label: '버리기', style: 'destructive', onPress: () => setClosing(true) },
      ],
    }),
  );
  return { close: (next?: Href) => setClosing(next ?? true) };
}

/**
 * 시트 머리: 손잡이(36×5) + [취소 회색 알약] 제목 [저장 베리 알약]. 시스템 헤더(iOS 26 유리 버튼, 다크에서 밝은 회색 원)를 끄고
 * FormScreen의 header로 스크롤 위에 고정한다. 취소는 닫기 보호(useSheetGuard)를 거친다
 */
export function SheetHeader({ title, onSave }: { title: string; onSave: () => void }) {
  return (
    <View>
      <View className="mt-[7px] h-[5px] w-9 self-center rounded-full bg-track" />
      <View className="mt-1 h-11 flex-row items-center px-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={4}
          className="h-9 min-w-[60px] items-center justify-center rounded-full bg-default px-4 active:opacity-70"
          accessibilityRole="button"
        >
          <Text className="text-[15px] font-medium">취소</Text>
        </Pressable>
        <Text className="flex-1 text-center text-[17px] font-semibold" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          onPress={onSave}
          hitSlop={4}
          className="h-9 min-w-[60px] items-center justify-center rounded-full bg-accent px-4 active:opacity-70"
          accessibilityRole="button"
        >
          <Text className="text-[15px] font-semibold text-accent-foreground">저장</Text>
        </Pressable>
      </View>
    </View>
  );
}
