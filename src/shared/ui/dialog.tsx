import { useEffect, useId, useSyncExternalStore } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { cn } from '../lib/utils';
import { GravityIcon } from './GravityIcon';
import { Text } from './primitives';
import { useColor, useOverlayShadow } from './theme';

// FR-11: 시스템 Alert 대신 쓰는 앱 모달. showDialog·confirm·notify로 어디서나(모델 코드 포함) 부른다.
// 시트(네이티브 모달) 위에서도 보여야 해서 DialogHost를 루트와 시트 화면(FormScreen) 양쪽에 두고, 가장 나중에 열린 화면의 Host만 그린다
type Action = { label: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type Dialog = { title: string; message?: string; actions: Action[] };

let current: Dialog | null = null;
let hosts: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

export function showDialog(d: Dialog) {
  current = d;
  emit();
}

/** 확인·취소 두 버튼. 확인을 누르면 true */
export function confirm(o: { title: string; message?: string; confirmLabel?: string; destructive?: boolean }): Promise<boolean> {
  return new Promise((resolve) =>
    showDialog({
      title: o.title,
      message: o.message,
      actions: [
        { label: '취소', style: 'cancel', onPress: () => resolve(false) },
        { label: o.confirmLabel ?? '확인', style: o.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
    }),
  );
}

/** 확인 버튼 하나짜리 안내 */
export function notify(title: string, message?: string) {
  showDialog({ title, message, actions: [{ label: '확인' }] });
}

const FADE = 160;

// 버튼 면과 글자색. 취소는 회색, 되돌릴 수 없는 동작만 벽돌색, 나머지(확인)는 강조색으로 채운다
const BUTTON = {
  cancel: ['bg-default', 'text-default-foreground'],
  destructive: ['bg-danger', 'text-danger-foreground'],
  default: ['bg-accent', 'text-accent-foreground'],
} as const;

export function DialogHost() {
  const id = useId();
  const c = useColor();
  const shadow = useOverlayShadow();
  useEffect(() => {
    hosts = [...hosts, id];
    emit();
    return () => {
      hosts = hosts.filter((h) => h !== id);
      emit();
    };
  }, [id]);
  const dialog = useSyncExternalStore(subscribe, () => current);
  const top = useSyncExternalStore(subscribe, () => hosts[hosts.length - 1]);
  if (!dialog || top !== id) return null;

  const close = (a?: Action) => {
    current = null;
    emit();
    a?.onPress?.();
  };
  const cancel = dialog.actions.find((a) => a.style === 'cancel');
  const destructive = dialog.actions.some((a) => a.style === 'destructive');
  return (
    // 투명 Modal로 띄워서 시트의 내비게이션 헤더까지 덮는다. 닫을 때는 Modal이 바로 내려가 페이드아웃은 없다
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close(cancel)}>
      <Animated.View
        entering={FadeIn.duration(FADE).reduceMotion(ReduceMotion.System)}
        className="flex-1 items-center justify-center bg-black/25 px-6"
      >
        {/* 바깥을 누르면 취소(취소 버튼이 없으면 닫기만) */}
        <Pressable className="absolute inset-0" onPress={() => close(cancel)} accessibilityLabel="닫기" />
        {/* 카드 다이얼로그: 왼쪽 정렬 제목·설명, 오른쪽 아래 알약 버튼. 되돌릴 수 없는 동작이면 위에 휴지통 칩을 두고 그 버튼만 벽돌색으로 채운다 */}
        <View
          className="w-full max-w-[340px] gap-1 rounded-3xl bg-elevated p-5"
          style={shadow}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          {destructive && (
            <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-danger-soft">
              <GravityIcon name="trash-bin" size={18} color={c.dangerInk} />
            </View>
          )}
          <Text className="text-[18px] leading-[26px] font-semibold">{dialog.title}</Text>
          {dialog.message && <Text className="text-[15px] leading-[22px] text-muted">{dialog.message}</Text>}
          <View className="mt-4 flex-row flex-wrap justify-end gap-2">
            {dialog.actions.map((a) => {
              const [box, text] = BUTTON[a.style ?? 'default'];
              return (
                <Pressable
                  key={a.label}
                  onPress={() => close(a)}
                  className={cn('h-10 items-center justify-center rounded-full px-4 active:opacity-70', box)}
                  accessibilityRole="button"
                >
                  <Text className={cn('text-[15px] font-semibold', text)}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
