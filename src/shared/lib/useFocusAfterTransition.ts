import { useNavigation } from 'expo-router';
import type { NativeStackNavigationProp } from 'expo-router/native-stack';
import { type ComponentRef, useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';

/**
 * 시트가 다 올라온 뒤 입력창에 포커스한다.
 * autoFocus는 시트가 올라오는 도중 입력창 위치를 재서 KeyboardAwareScrollView가 화면을 과하게 밀어 올린다
 */
export function useFocusAfterTransition(enabled: boolean) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  useEffect(() => {
    if (!enabled) return;
    return navigation.addListener('transitionEnd', (e) => {
      if (!e.data.closing) ref.current?.focus();
    });
  }, [navigation, enabled]);
  return ref;
}
