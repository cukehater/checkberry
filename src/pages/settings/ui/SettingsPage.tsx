import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exportBackup, exportHabitsCsv, exportTasksCsv, pickAndRestore } from '@/features/backup';
import { loadTheme, saveTheme, type ThemeMode } from '@/features/theme';
import { snapshot, useQuery } from '@/shared/db';
import { cn, diffDays, formatAgo, toDateStr, useToday } from '@/shared/lib';
import {
  ActionButton,
  confirm,
  Icon,
  IconChip,
  type IconName,
  LargeTitle,
  ListGroup,
  Segmented,
  Separator,
  showToast,
  Text,
  useColor,
} from '@/shared/ui';

function Item({ label, desc, dot, icon, onPress }: { label: string; desc?: string; dot?: string; icon: IconName; onPress: () => void }) {
  const c = useColor();
  return (
    // 카드 안 행: 유형 아이콘 칩, 제목·설명, 오른쪽 화살표
    <Pressable onPress={onPress} className="flex-row items-center gap-3 active:opacity-60" accessibilityRole="button">
      {/* 장식이라 베리를 쓰지 않고 회색 원 + 보조 글자색 */}
      <IconChip name={icon} size={32} tone="neutral" />
      <View className={cn('flex-1 flex-row items-center gap-2 py-3', desc ? 'min-h-[68px]' : 'min-h-14')}>
        <View className="flex-1 gap-0.5">
          <Text className="text-[16px] leading-[22px] font-medium">{label}</Text>
          {desc && (
            <View className="flex-row items-center gap-1.5">
              {dot && <View className={cn('size-2 rounded-full', dot)} />}
              <Text className="text-[14px] leading-5 text-muted">{desc}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={14} tint={c.sub} />
      </View>
    </Pressable>
  );
}

/** 카드 위 묶음 이름(14 Medium muted) */
function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="mb-2 px-1 text-[14px] leading-5 font-medium text-muted" accessibilityRole="header">
      {title}
    </Text>
  );
}

const run = (fn: () => Promise<unknown>) => () => fn().catch(() => showToast({ message: '작업을 마치지 못했어요', tone: 'error' }));

const THEMES = [
  ['system', '시스템'],
  ['light', '라이트'],
  ['dark', '다크'],
] as const;

// S10 설정. 시간대는 기기 설정, 주 시작은 일요일 고정(MVP)
export function SettingsPage() {
  const db = useSQLiteContext();
  const c = useColor();
  const top = useSafeAreaInsets().top;
  const today = useToday();
  const last = useQuery<{ value: string }>("SELECT value FROM settings WHERE key = 'last_backup_at'")[0]?.value;
  const theme = useQuery<{ value: ThemeMode }>("SELECT value FROM settings WHERE key = 'theme'")[0]?.value ?? 'system';
  // 백업 상태 점: 7일 이내 잎, 넘으면 warning, 없으면 muted
  const backupDot = !last ? 'bg-muted' : diffDays(toDateStr(new Date(last)), today) <= 7 ? 'bg-success' : 'bg-warning';

  const wipe = run(async () => {
    // 지우기 직전 스냅숏은 기기에 남지만 앱에서 되돌리는 화면은 없다. 되돌릴 수 있는 길(백업 파일)만 안내한다
    const ok = await confirm({
      title: '모든 데이터를 지울까요?',
      message: '습관, 습관 기록, 할 일이 모두 지워져요.',
      hint: '앱에서는 되돌릴 수 없어요. 필요하면 먼저 백업 파일을 만들어 두세요.',
      confirmLabel: '모두 지우기',
      destructive: true,
    });
    if (!ok) return;
    await snapshot(db, 'wipe');
    await db.withTransactionAsync(async () => {
      for (const t of ['events', 'habit_logs', 'habits', 'task_groups']) await db.runAsync(`DELETE FROM ${t}`);
      // 화면 모드는 데이터가 아니라 기기 취향이라 남긴다
      await db.runAsync("DELETE FROM settings WHERE key NOT IN ('onboarded', 'theme')");
    });
  });

  return (
    // 시스템 헤더 대신 회색 '뒤로' 알약과 큰 제목을 직접 그린다(가장자리 밀어 돌아가기는 그대로)
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12" contentContainerStyle={{ paddingTop: top + 8 }}>
      <View className="mb-3 h-11 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          hitSlop={4}
          className="h-10 flex-row items-center gap-1 rounded-full bg-default pr-3.5 pl-2.5 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Icon name="chevron-left" size={16} tint={c.text} />
          <Text className="text-[15px] font-semibold">뒤로</Text>
        </Pressable>
      </View>
      <View className="px-1">
        <LargeTitle title="설정" />
      </View>

      <SectionLabel title="화면 모드" />
      <Segmented options={THEMES} value={theme} onChange={(m) => saveTheme(db, m)} />

      <View className="mt-5">
        <SectionLabel title="백업" />
      </View>
      <ListGroup>
        <Item
          icon="upload"
          label="백업 파일 만들기"
          desc={last ? `마지막 백업 ${formatAgo(last)}` : '아직 백업한 적이 없어요'}
          dot={backupDot}
          onPress={run(() => exportBackup(db))}
        />
        <Separator className="ml-11" />
        <Item
          icon="download"
          label="백업 파일로 복원"
          onPress={run(async () => {
            if (!(await pickAndRestore(db))) return;
            await loadTheme(db); // 백업에 담긴 화면 모드
            showToast({ message: '복원했어요', tone: 'success' });
          })}
        />
      </ListGroup>
      <Text className="mt-2 px-1 text-[13px] leading-[19px] text-muted">
        데이터는 이 기기에만 저장돼요. 기기를 바꾸기 전에 백업 파일을 만들어 두세요.
      </Text>

      <View className="mt-5">
        <SectionLabel title="내보내기" />
      </View>
      <ListGroup>
        <Item icon="export" label="할 일 목록" desc="CSV 파일로 내보내요" onPress={run(() => exportTasksCsv(db))} />
        <Separator className="ml-11" />
        <Item icon="export" label="습관 기록" desc="CSV 파일로 내보내요" onPress={run(() => exportHabitsCsv(db))} />
      </ListGroup>

      <View className="mt-8">
        <ActionButton label="모든 데이터 삭제" tone="danger" icon="trash" onPress={wipe} />
      </View>
    </ScrollView>
  );
}
