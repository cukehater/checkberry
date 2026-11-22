import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmojiPicker, { ko } from 'rn-emoji-keyboard';
import { Icon, useColor } from '@/shared/ui';

/** 할 일 제목 이모지 선택 창. 이모지 데이터가 커서 EventPage가 처음 열 때만 require한다 */
export function EmojiSheet({
  open,
  emoji,
  onSelect,
  onRemove,
  onClose,
}: {
  open: boolean;
  emoji: string;
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const c = useColor();
  const bottomInset = useSafeAreaInsets().bottom;
  return (
    <EmojiPicker
      open={open}
      onClose={onClose}
      onEmojiSelected={(e) => onSelect(e.emoji)}
      customButtons={
        emoji ? (
          <Pressable
            onPress={() => (onRemove(), onClose())}
            className="mt-4 h-9 w-9 items-center justify-center rounded-full bg-danger-soft active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="이모지 없애기"
          >
            <Icon name="close" size={14} tint={c.dangerInk} />
          </Pressable>
        ) : null
      }
      translation={ko}
      enableSearchBar
      enableRecentlyUsed
      // 라이브러리의 SafeAreaView는 판 아래에 빈 띠를 남기고 목록이 판 밖으로 비친다. 바닥에 붙이고 여백은 직접 준다
      disableSafeArea
      styles={{ container: { overflow: 'hidden', paddingBottom: bottomInset, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
      theme={{
        knob: c.track,
        container: c.sheet,
        header: c.sub,
        category: { icon: c.sub, iconActive: c.accent, container: c.raisedBg, containerActive: c.accentSoft },
        search: { background: c.neutral, text: c.text, placeholder: c.sub, icon: c.sub },
        emoji: { selected: c.accentSoft },
      }}
    />
  );
}
