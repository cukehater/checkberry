import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { Icon, type IconName, TAB_BAR_HEIGHT, useTabBarBottom } from './components';
import { Text } from './primitives';
import { useColor, useOverlayShadow } from './theme';

// E-02: 삭제 후 5초 동안 실행취소. 화면 전환(시트 닫힘)을 넘어 보여야 해서 루트에 한 번만 둔다
type Undo = { message: string; undo: () => void; icon: IconName } | null;
let current: Undo = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const set = (u: Undo) => {
  current = u;
  listeners.forEach((l) => l());
};

/** icon은 왼쪽 베리 칩의 글리프. 삭제는 휴지통(기본), 반복 미루기는 repeat */
export function showUndo(message: string, undo: () => void, icon: IconName = 'trash') {
  clearTimeout(timer);
  set({ message, undo, icon });
  // accessibilityLiveRegion은 Android만 읽어 줘서 VoiceOver에는 직접 알린다
  AccessibilityInfo.announceForAccessibility(`${message}. 실행취소를 누르면 되돌려요`);
  timer = setTimeout(() => set(null), 5000);
}

export function UndoBar() {
  const u = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  );
  const c = useColor();
  const shadow = useOverlayShadow();
  // 떠 있는 탭 바 위 14pt
  const bottom = useTabBarBottom() + TAB_BAR_HEIGHT + 14;
  if (!u) return null;
  return (
    // 탭 바 위에 띄우고, 키보드가 올라오면 키보드 8pt 위로 따라 올라간다(키보드에 가리지 않게)
    // KeyboardStickyView는 className이 먹지 않아 위치는 style로 준다
    <KeyboardStickyView offset={{ opened: bottom - 8 }} style={{ position: 'absolute', left: 16, right: 16, bottom }}>
      {/* 아래에서 250ms 동안 올라오고, 닫힐 때는 160ms 동안 흐려진다. 새 실행취소는 key로 다시 올라온다 */}
      <Animated.View
        key={u.message}
        entering={FadeInDown.duration(250).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
        className="flex-row items-center gap-3 rounded-3xl bg-elevated py-2.5 pr-2.5 pl-3"
        style={shadow}
        accessibilityLiveRegion="polite"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
          <Icon name={u.icon} size={16} tint={c.accentInk} />
        </View>
        <Text className="flex-1 text-[15px] leading-5 font-medium" numberOfLines={1}>
          {u.message}
        </Text>
        <Pressable
          className="h-9 justify-center rounded-full bg-default px-3.5 active:opacity-70"
          hitSlop={4}
          onPress={() => {
            u.undo();
            set(null);
          }}
          accessibilityRole="button"
        >
          <Text className="text-[14px] font-semibold">실행취소</Text>
        </Pressable>
      </Animated.View>
    </KeyboardStickyView>
  );
}
