import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { setSetting, useQuery } from '@/shared/db';
import { cn } from '@/shared/lib';
import { allGravityIcons, GravityIcon, IconButton, SearchField, Text, useCardStyle, useColor } from '@/shared/ui';

// 습관에 어울리는 32개를 앞에 둔다. API·SQL·화살표 같은 나머지는 검색할 때만 나온다
const SUGGESTED = [
  'book-open',
  'books',
  'pencil',
  'graduation-cap',
  'droplet',
  'cup',
  'mug',
  'pill',
  'heart-pulse',
  'heart',
  'person',
  'persons',
  'flame',
  'sun',
  'moon',
  'music-note',
  'thunderbolt',
  'sparkles',
  'clock',
  'broom-motion',
  'shopping-cart',
  'wallet',
  'gift',
  'face-smile',
  'medal',
  'star',
  'cherry',
  'camera',
  'palette',
  'paintbrush',
  'globe',
  'tv',
];

// 한국어로 찾을 때 쓰는 별칭. 값은 아이콘 이름에 들어가는 영문 조각
const KO_ALIASES: Record<string, string[]> = {
  책: ['book'],
  독서: ['book'],
  공부: ['graduation', 'book', 'pencil'],
  글쓰기: ['pencil', 'text'],
  일기: ['pencil', 'book'],
  운동: ['person', 'weight', 'thunderbolt', 'heart-pulse'],
  달리기: ['person', 'speedometer'],
  걷기: ['person', 'route', 'geo'],
  체중: ['weight', 'scales'],
  건강: ['heart-pulse', 'stethoscope', 'pill'],
  약: ['pill'],
  병원: ['stethoscope', 'pill'],
  물: ['droplet'],
  커피: ['mug', 'cup'],
  차: ['mug', 'cup', 'car'],
  음식: ['cherry', 'mug'],
  과일: ['cherry'],
  수면: ['moon'],
  잠: ['moon'],
  아침: ['sun'],
  날씨: ['sun', 'cloud', 'snowflake', 'umbrella'],
  명상: ['sparkles', 'circles-concentric'],
  마음: ['heart', 'face-smile'],
  감정: ['face'],
  사랑: ['heart'],
  음악: ['music', 'headphones'],
  악기: ['music'],
  노래: ['microphone', 'music'],
  영화: ['filmstrip', 'video', 'tv'],
  사진: ['camera', 'picture'],
  그림: ['brush', 'palette', 'paintbrush'],
  돈: ['wallet', 'circle-dollar', 'sack', 'credit-card'],
  저축: ['sack', 'vault', 'wallet'],
  쇼핑: ['shopping', 'tag', 'gift'],
  선물: ['gift'],
  휴대폰: ['smartphone'],
  전화: ['handset', 'smartphone'],
  컴퓨터: ['display', 'keyboard', 'cpu'],
  코딩: ['code', 'terminal'],
  일: ['briefcase', 'suitcase'],
  회사: ['briefcase', 'factory'],
  메일: ['envelope'],
  청소: ['broom', 'bucket', 'trash'],
  정리: ['archive', 'box', 'folder'],
  여행: ['plane', 'suitcase', 'globe', 'map'],
  집: ['house'],
  자동차: ['car'],
  시간: ['clock', 'hourglass', 'stopwatch'],
  알림: ['bell'],
  목표: ['target', 'flag', 'medal'],
  별: ['star'],
  불: ['flame'],
  식물: ['circle-tree', 'sparkles'],
  반려동물: ['snail', 'ghost'],
  게임: ['dice', 'puzzle', 'gem'],
  체크: ['check'],
};

const COLUMNS = 6;
const RECENT_MAX = 8;

/** 습관 아이콘 고르기 시트. 검색(영문 이름 + 한국어 별칭), 최근 사용 8개, 6열 격자. 저장 형식은 `gi:<이름>` */
export function IconPicker({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: string;
  onPick: (iconKey: string) => void;
  onClose: () => void;
}) {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const recentRow = useQuery<{ value: string | null }>("SELECT value FROM settings WHERE key = 'recentIcons'");
  // 전체 데이터는 시트를 처음 열 때 읽는다
  const names = useMemo(() => (visible ? Object.keys(allGravityIcons()) : []), [visible]);
  const recent = useMemo(() => {
    try {
      const list: unknown = JSON.parse(recentRow[0]?.value ?? '[]');
      return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string').slice(0, RECENT_MAX) : [];
    } catch {
      return [];
    }
  }, [recentRow]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    // 검색 전에는 습관에 어울리는 아이콘을 먼저 보여 준다(이름순이면 API·SQL·화살표 수십 개가 앞에 온다)
    if (!q) return SUGGESTED.filter((n) => names.includes(n));
    const parts = Object.entries(KO_ALIASES).flatMap(([ko, en]) => (ko.includes(q) || q.includes(ko) ? en : []));
    return names.filter((n) => n.includes(q) || parts.some((p) => n.includes(p)));
  }, [names, q]);

  const pick = (name: string) => {
    onPick(`gi:${name}`);
    setSetting(db, 'recentIcons', JSON.stringify([name, ...recent.filter((n) => n !== name)].slice(0, RECENT_MAX)));
    setQuery('');
    onClose();
  };
  const selected = value.startsWith('gi:') ? value.slice(3) : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between pt-3 pr-2 pl-5">
          <Text className="text-[17px] font-semibold">아이콘 고르기</Text>
          <IconButton name="close" size={14} onPress={onClose} accessibilityLabel="닫기" />
        </View>
        <View className="px-4 pt-2 pb-3">
          <SearchField value={query} onChangeText={setQuery} placeholder="이름으로 찾기 (예: 책, book)" accessibilityLabel="아이콘 찾기" />
        </View>
        <FlatList
          data={shown}
          keyExtractor={(n) => n}
          numColumns={COLUMNS}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // 검색 중 키보드 높이만큼 아래 여백이 생겨 결과 마지막 줄까지 올려 볼 수 있다
          renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}
          contentContainerClassName="px-3 pb-10"
          ListHeaderComponent={
            !q && recent.length > 0 ? (
              <View className="pb-2">
                <Text className="px-1 pb-1 text-[14px] leading-5 font-medium">최근 사용</Text>
                <View className="flex-row flex-wrap">
                  {recent.map((n) => (
                    <IconCell key={n} name={n} on={n === selected} onPress={() => pick(n)} />
                  ))}
                </View>
                <Text className="px-1 pt-3 pb-1 text-[14px] leading-5 font-medium">추천</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={<Text className="py-10 text-center text-[15px] text-muted">찾는 아이콘이 없어요.</Text>}
          renderItem={({ item }) => <IconCell name={item} on={item === selected} onPress={() => pick(item)} />}
        />
      </View>
    </Modal>
  );
}

function IconCell({ name, on, onPress }: { name: string; on: boolean; onPress: () => void }) {
  const c = useColor();
  const card = useCardStyle();
  return (
    <View className="w-1/6 p-1">
      <Pressable
        onPress={onPress}
        className={cn('aspect-square items-center justify-center rounded-2xl active:opacity-70', on ? 'bg-accent' : 'bg-card')}
        style={on ? undefined : card}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${name} 아이콘`}
      >
        <GravityIcon name={name} size={22} color={on ? c.onAccent : c.text} />
      </Pressable>
    </View>
  );
}
