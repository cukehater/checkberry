import { useEffect, useId, useSyncExternalStore } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { cn } from '../lib/utils';
import { Text } from './primitives';

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

export function DialogHost() {
  const id = useId();
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
  return (
    // 투명 Modal로 띄워서 시트의 내비게이션 헤더까지 덮는다. 닫을 때는 Modal이 바로 내려가 페이드아웃은 없다
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close(cancel)}>
      <Animated.View
        entering={FadeIn.duration(FADE).reduceMotion(ReduceMotion.System)}
        className="flex-1 items-center justify-center bg-black/30"
      >
        {/* 바깥을 누르면 취소(취소 버튼이 없으면 닫기만) */}
        <Pressable className="absolute inset-0" onPress={() => close(cancel)} accessibilityLabel="닫기" />
        {/* iOS 알림 모양: 가운데 정렬 제목·설명, 머리카락 선 아래 글자 버튼. 버튼이 둘이면 가로, 셋 이상이면 세로로 쌓는다 */}
        <View className="w-[270px] overflow-hidden rounded-[14px] bg-elevated" accessibilityViewIsModal accessibilityRole="alert">
          <View className="gap-1 px-4 pt-5 pb-4">
            <Text className="text-center text-[17px] font-semibold">{dialog.title}</Text>
            {dialog.message && <Text className="text-center text-[13px] leading-[18px]">{dialog.message}</Text>}
          </View>
          <View className={cn('border-t-[0.5px] border-separator', dialog.actions.length === 2 && 'flex-row')}>
            {dialog.actions.map((a, i) => (
              <Pressable
                key={a.label}
                onPress={() => close(a)}
                className={cn(
                  'min-h-11 flex-1 items-center justify-center px-2 active:bg-default',
                  i > 0 && (dialog.actions.length === 2 ? 'border-l-[0.5px] border-separator' : 'border-t-[0.5px] border-separator'),
                )}
                accessibilityRole="button"
              >
                <Text
                  className={cn(
                    'text-[17px]',
                    a.style === 'destructive' ? 'text-danger' : 'text-accent',
                    a.style === 'cancel' && 'font-semibold',
                  )}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
