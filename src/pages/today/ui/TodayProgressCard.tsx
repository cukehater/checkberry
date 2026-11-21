import { Surface } from 'heroui-native';
import { View } from 'react-native';
import { Text, useColor } from '@/shared/ui';
import { ProgressRings } from './ProgressRings';

function LegendRow({ color, label, done, total }: { color: string; label: string; done: number; total: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="flex-1 text-[14px] leading-5 text-muted">{label}</Text>
      <Text className="text-[15px] leading-5 font-semibold tabular-nums">
        {done}
        <Text className="font-medium text-muted">/{total}</Text>
      </Text>
    </View>
  );
}

/** 오늘 화면 맨 위 카드: 이중 링 + 인사말 + 범례. children은 인사말 아래(지연 로젠지 등) */
export function TodayProgressCard({
  greeting,
  habitsDone,
  habitsTotal,
  tasksDone,
  tasksTotal,
  allDone,
  finishing,
  children,
}: {
  greeting: string;
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  allDone: boolean;
  finishing: boolean;
  children?: React.ReactNode;
}) {
  const c = useColor();
  return (
    <Surface variant="default" className="flex-row items-center gap-5 rounded-3xl p-5">
      <ProgressRings
        habitsDone={habitsDone}
        habitsTotal={habitsTotal}
        tasksDone={tasksDone}
        tasksTotal={tasksTotal}
        allDone={allDone}
        finishing={finishing}
      />
      <View className="min-w-0 flex-1 gap-4">
        <View className="gap-1.5">
          <Text className="text-[17px] leading-[22px] font-semibold tracking-[-0.2px]">{greeting}</Text>
          {children}
        </View>
        <View className="gap-2.5">
          <LegendRow color={c.accent} label="습관" done={habitsDone} total={habitsTotal} />
          <LegendRow color={c.success} label="할 일" done={tasksDone} total={tasksTotal} />
        </View>
      </View>
    </Surface>
  );
}
