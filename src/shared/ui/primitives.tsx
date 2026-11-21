import { Text as RNText, TextInput } from 'react-native';
import { cn } from '../lib/utils';
import { useColor } from './theme';

/** 기본 글자. 테마 글자색과 16px */
export function Text({ className, ...props }: React.ComponentProps<typeof RNText>) {
  return <RNText className={cn('text-base font-normal text-foreground', className)} {...props} />;
}

/** 입력창. 테두리 친 흰 칸. multiline이면 위에서부터 쓴다 */
export function Input({ className, multiline, ...props }: React.ComponentProps<typeof TextInput>) {
  const c = useColor();
  return (
    <TextInput
      className={cn(
        'min-h-12 rounded-[14px] border border-field-border bg-field px-4 text-[17px] font-normal text-foreground',
        multiline && 'min-h-24 pt-3 pb-3',
        className,
      )}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      placeholderTextColor={c.sub}
      selectionColor={c.accent}
      {...props}
    />
  );
}
