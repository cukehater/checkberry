import { type Href, router, Stack, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { showDialog } from './dialog';
import { useColor } from './theme';

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
 * 시트 상단의 취소·저장. 한 손으로도 키보드에 가리지 않는 자리에 둔다.
 * iOS 26부터 헤더의 커스텀 뷰는 유리 원에 갇히고 다크 모드에서 글자가 묻혀서, 시스템 바 버튼으로 그린다(저장은 틴트로 채운 prominent)
 */
export function SheetHeader({ onSave }: { onSave: () => void }) {
  const c = useColor();
  const font = { fontWeight: '600', fontSize: 17 } as const;
  return (
    <Stack.Screen
      options={{
        unstable_headerLeftItems: () => [{ type: 'button', label: '취소', labelStyle: font, onPress: () => router.back() }],
        unstable_headerRightItems: () => [
          { type: 'button', label: '저장', labelStyle: font, variant: 'prominent', tintColor: c.accent, onPress: onSave },
        ],
      }}
    />
  );
}
