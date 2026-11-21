/** 마지막 글자 받침 여부. 끝의 따옴표·괄호는 건너뛰고, 한글이 아니면(숫자·영문 끝) 받침 없음으로 본다 */
function hasBatchim(word: string): boolean {
  const w = word.replace(/[\s'"‘’“”」』)\]]+$/u, '');
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 이/가 */
export const iGa = (w: string) => `${w}${hasBatchim(w) ? '이' : '가'}`;
/** 을/를 */
export const eulReul = (w: string) => `${w}${hasBatchim(w) ? '을' : '를'}`;
/** 과/와 */
export const gwaWa = (w: string) => `${w}${hasBatchim(w) ? '과' : '와'}`;
