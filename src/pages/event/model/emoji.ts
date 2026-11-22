// 국기(지역 표시 문자 2개) 또는 그림 문자 + 이형·피부색·ZWJ 이음
const LEADING_EMOJI = /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*)\s*/u;

/** 저장된 제목 맨 앞의 이모지를 떼어 낸다. 시트는 이모지를 버튼에, 나머지를 입력칸에 보여 준다 */
export function splitEmoji(title: string) {
  const m = title.match(LEADING_EMOJI);
  return m ? { emoji: m[0].trim(), rest: title.slice(m[0].length) } : { emoji: '', rest: title };
}

/** 저장할 제목. 이모지가 있으면 '이모지 + 공백 + 제목' */
export const joinEmoji = (emoji: string, rest: string) => (emoji ? `${emoji} ${rest}` : rest);
