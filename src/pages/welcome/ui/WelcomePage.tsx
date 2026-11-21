import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickAndRestore } from '@/features/backup';
import { setSetting } from '@/shared/db';
import { ActionButton, BrandMark, Icon, notify, Text, useColor } from '@/shared/ui';

const FEATURES: [string, string][] = [
  ['습관', '매일, 요일 지정, 주 N회 중에서 골라요'],
  ['할 일', '날짜, 반복, 중요도를 정해요'],
  ['오프라인', '로그인 없이 이 기기에만 저장돼요'],
];

// S12 온보딩. 로그인 없음, 데이터는 이 기기에만 저장
export function WelcomePage() {
  const db = useSQLiteContext();
  const c = useColor();
  const start = async () => {
    await setSetting(db, 'onboarded', '1');
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* 앱 표식과 이름, 소개, 카드에 담은 기능 목록, 맨 아래 주 버튼과 글자 버튼 */}
      <View className="flex-1 px-5">
        <View className="flex-1 justify-center gap-10">
          <Animated.View entering={FadeInDown.duration(400)} className="gap-2 px-1">
            <BrandMark size={56} />
            <Text className="mt-3 text-[34px] leading-[40px] font-bold tracking-tight">checkberry</Text>
            <Text className="text-[17px] leading-[24px] text-muted">오늘의 습관과 할 일을 한 화면에서 챙겨요.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            {/* 앱이 하는 일을 이미 체크된 목록으로 보여 준다(앱의 체크 상자 모양 그대로) */}
            <View className="gap-4 px-1">
              {FEATURES.map(([title, desc]) => (
                <View key={title} className="flex-row gap-3">
                  <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-[5px] bg-accent">
                    <Icon name="check" size={12} tint={c.onAccent} />
                  </View>
                  <Text className="flex-1 text-[16px] leading-[22px]">
                    <Text className="text-[16px] font-semibold">{title}</Text> <Text className="text-[16px] text-muted">{desc}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        <View className="gap-1 pb-4">
          <ActionButton label="시작하기" onPress={start} />
          <ActionButton
            label="백업 파일로 복원"
            tone="link"
            onPress={() =>
              pickAndRestore(db)
                .then((ok) => ok && router.replace('/'))
                .catch((e: Error) => notify('복원하지 못했어요', e.message))
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
