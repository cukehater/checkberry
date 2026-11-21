import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, View } from 'react-native';
import { exportBackup, exportHabitsCsv, exportTasksCsv, pickAndRestore } from '@/features/backup';
import { snapshot, useQuery } from '@/shared/db';
import { formatDateTime } from '@/shared/lib';
import { confirm, Icon, IconChip, type IconName, ListGroup, ListHeader, notify, Separator, Text, useColor } from '@/shared/ui';

function Item({
  label,
  desc,
  icon,
  danger,
  onPress,
}: {
  label: string;
  desc?: string;
  icon: IconName;
  danger?: boolean;
  onPress: () => void;
}) {
  const c = useColor();
  return (
    // 카드 안 행: 유형 아이콘, 제목·설명, 오른쪽 화살표. 삭제 행은 빨간 아이콘과 글자
    <Pressable onPress={onPress} className="min-h-14 flex-row items-center gap-3 py-2.5 active:opacity-60" accessibilityRole="button">
      {danger ? (
        <View className="h-7 w-7 items-center justify-center">
          <Icon name="trash" size={18} tint={c.danger} />
        </View>
      ) : (
        <IconChip name={icon} size={28} />
      )}
      <View className="flex-1 gap-0.5">
        <Text className={danger ? 'text-[16px] text-danger' : 'text-[16px]'}>{label}</Text>
        {desc && <Text className="text-[13px] text-muted">{desc}</Text>}
      </View>
      {!danger && <Icon name="chevron-right" size={13} tint={c.sub} />}
    </Pressable>
  );
}

const run = (fn: () => Promise<unknown>) => () => fn().catch((e: Error) => notify('작업을 마치지 못했어요', e.message));

// S10 설정. 시간대는 기기 설정, 주 시작은 일요일 고정(MVP)
export function SettingsPage() {
  const db = useSQLiteContext();
  const last = useQuery<{ value: string }>("SELECT value FROM settings WHERE key = 'last_backup_at'")[0]?.value;

  const wipe = run(async () => {
    const ok = await confirm({
      title: '모든 데이터를 삭제할까요?',
      message: '습관, 습관 기록, 할 일이 모두 지워져요. 지우기 직전 상태는 기기 안에만 따로 남겨 둬요.',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    await snapshot(db, 'wipe');
    await db.withTransactionAsync(async () => {
      for (const t of ['events', 'habit_logs', 'habits', 'task_groups']) await db.runAsync(`DELETE FROM ${t}`);
      await db.runAsync("DELETE FROM settings WHERE key <> 'onboarded'");
    });
  });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-12">
      <ListHeader title="백업" />
      <ListGroup>
        <Item
          icon="upload"
          label="백업 파일 만들기"
          desc={last ? `마지막 백업: ${formatDateTime(last)}` : '아직 백업한 적이 없어요'}
          onPress={run(() => exportBackup(db))}
        />
        <Separator className="ml-10" />
        <Item icon="download" label="백업 파일로 복원" onPress={run(async () => (await pickAndRestore(db)) && notify('복원했어요'))} />
      </ListGroup>
      <Text className="mt-2 px-1 text-[13px] leading-[18px] text-muted">
        데이터는 이 기기에만 저장돼요. 기기를 바꾸기 전에 백업 파일을 만들어 두세요.
      </Text>

      <ListHeader title="내보내기" />
      <ListGroup>
        <Item icon="tasks" label="할 일 목록" desc="CSV 파일로 내보내요" onPress={run(() => exportTasksCsv(db))} />
        <Separator className="ml-10" />
        <Item icon="habits" label="습관 기록" desc="CSV 파일로 내보내요" onPress={run(() => exportHabitsCsv(db))} />
      </ListGroup>

      <ListGroup className="mt-10">
        <Item icon="trash" danger label="모든 데이터 삭제" onPress={wipe} />
      </ListGroup>
    </ScrollView>
  );
}
