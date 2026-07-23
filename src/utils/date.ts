import { DEADLINE } from "@src/config/constants";

export function dateToString(origin: Date) {
  const year = origin.getFullYear();
  const month = origin.getMonth() + 1;
  const day = origin.getDate();
  const hour = origin.getHours();
  const minute = origin.getMinutes();
  const second = origin.getSeconds();

  return `${year}-${('00' + month).slice(-2)}-${('00' + day).slice(-2)} ${('00' + hour).slice(-2)}:${('00' + minute).slice(-2)}:${('00' + second).slice(-2)}`;
}

export function getOrderAvailableTimes() {
  const now = new Date();
  const ret1 = new Date();
  const ret2 = new Date();

  ret1.setHours(DEADLINE);
  ret1.setMinutes(0);
  ret1.setSeconds(0);
  ret1.setMilliseconds(0);

  if (now.getHours() < DEADLINE) {
    ret1.setDate(ret1.getDate() - 1);
  } else {
    ret2.setDate(ret2.getDate() + 1);
  }

  return [dateToString(ret1), dateToString(ret2)];
}

export function isSameDay(day1: Date, day2: Date): boolean {
  return (day1.getFullYear() === day2.getFullYear()) && (day1.getMonth() === day2.getMonth()) && (day1.getDate() === day2.getDate());
}

/**
 * 그릇 수거 가능 시간 설정("HH:MM~HH:MM" 또는 null)을 기준으로
 * 현재 시각이 수거 가능 시간 범위 내인지 판정합니다.
 * 설정값이 없거나 파싱 실패 시 항상 허용(true)합니다.
 * 시작 시간 > 종료 시간이면 자정을 넘기는 범위로 처리합니다. (예: 23:00~02:00)
 */
export function isWithinDisposalTime(stringValue: string | null, now: Date = new Date()): boolean {
  if (!stringValue) {
    return true; // 설정값 없으면 항상 허용
  }

  const [startTime, endTime] = stringValue.split('~');
  if (!startTime || !endTime) {
    return true; // 파싱 실패 시 항상 허용
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // 같은 날 범위 (예: 09:00~18:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // 자정을 넘기는 범위 (예: 22:00~06:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

