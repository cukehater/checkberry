import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Pressable } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './primitives';

// E-02: 삭제 후 5초 동안 실행취소. 화면 전환(시트 닫힘)을 넘어 보여야 해서 루트에 한 번만 둔다
type Undo = { message: string; undo: () => void } | null;
let current: Undo = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const set = (u: Undo) => {
  current = u;
  listeners.forEach((l) => l());
};

export function showUndo(message: string, undo: () => void) {
  clearTimeout(timer);
  set({ message, undo });
  // accessibilityLiveRegion은 Android만 읽어 줘서 VoiceOver에는 직접 알린다
  AccessibilityInfo.announceForAccessibility(`${message}. 실행취소를 누르면 되돌려요`);
  timer = setTimeout(() => set(null), 5000);
}

export function UndoBar() {
  const u = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  );
  const insets = useSafeAreaInsets();
  if (!u) return null;
  return (
    // 탭 바 위에 띄우고, 키보드가 올라오면 키보드 8pt 위로 따라 올라간다(키보드에 가리지 않게)
    // KeyboardStickyView는 className이 먹지 않아 위치는 style로 준다
    <KeyboardStickyView
      offset={{ opened: insets.bottom + 56 }}
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 64 }}
    >
      {/* 아래에서 250ms 동안 올라오고, 닫힐 때는 160ms 동안 흐려진다. 새 실행취소는 key로 다시 올라온다 */}
      <Animated.View
        key={u.message}
        entering={FadeInDown.duration(250).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
        className="min-h-12 flex-row items-center rounded-full bg-foreground pl-5 shadow-lg shadow-black/20"
        accessibilityLiveRegion="polite"
      >
        <Text className="flex-1 text-[15px] font-medium text-background">{u.message}</Text>
        <Pressable
          className="min-h-12 justify-center px-5 active:opacity-60"
          onPress={() => {
            u.undo();
            set(null);
          }}
          accessibilityRole="button"
        >
          <Text className="text-[15px] font-bold text-background underline">실행취소</Text>
        </Pressable>
      </Animated.View>
    </KeyboardStickyView>
  );
}
