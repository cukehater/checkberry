/** 축하하는 연속 기록 이정표 */
const MILESTONES = [3, 7, 14, 30, 100];

export const isMilestone = (n: number) => MILESTONES.includes(n);
