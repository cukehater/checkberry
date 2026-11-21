import { useLocalSearchParams } from 'expo-router';
import { HabitEditPage } from '@/pages/habit-edit';

export default function EditHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HabitEditPage id={id} />;
}
