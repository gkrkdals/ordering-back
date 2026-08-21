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

/**
 * 조회 화면에서 고른 날짜 범위를 영업일 기준 시각 범위로 바꿉니다.
 *
 * 하루는 09시에 시작한다고 보며(주문 마감 시각과 동일한 규약),
 * 여러 날을 고르면 마지막 날 다음 날 08:59:59까지 포함합니다.
 * 주문내역·적립금내역 조회가 같은 규칙을 쓰도록 여기에 둡니다.
 */
export function getBusinessDayRange(startDate: string, endDate: string): [string, string] {
  const start = new Date(startDate), end = new Date(endDate);

  start.setHours(9, 0, 0, 0);
  if (isSameDay(start, end)) {
    end.setHours(23, 59, 59, 999);
  } else {
    end.setDate(end.getDate() + 1);
    end.setHours(8, 59, 59, 999);
  }

  return [dateToString(start), dateToString(end)];
}

export function isSameDay(day1: Date, day2: Date): boolean {
  return (day1.getFullYear() === day2.getFullYear()) && (day1.getMonth() === day2.getMonth()) && (day1.getDate() === day2.getDate());
}

/** 요일 라벨. Settings 의 sml 1~7 과 1:1 대응합니다. (sml 1 = 월요일) */
export const WEEKDAY_NAMES = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

/**
 * 날짜를 Settings 의 sml 요일 인덱스(1=월 … 7=일)로 변환합니다.
 * 자동 품절/해제 설정(big=4)과 동일한 규약입니다.
 */
export function getWeekdaySml(date: Date = new Date()): number {
  const day = date.getDay(); // 0=일, 1=월 … 6=토
  return day === 0 ? 7 : day;
}

/** 전날 요일의 sml 인덱스를 반환합니다. (월요일 → 일요일) */
export function getPreviousWeekdaySml(sml: number): number {
  return sml === 1 ? 7 : sml - 1;
}

interface TimeWindow {
  start: number;
  end: number;
}

/** "HH:MM~HH:MM" 을 분 단위 구간으로 파싱합니다. 값이 없거나 형식이 깨지면 null. */
function parseTimeWindow(stringValue: string | null | undefined): TimeWindow | null {
  if (!stringValue) {
    return null;
  }

  const [startTime, endTime] = stringValue.split('~');
  if (!startTime || !endTime) {
    return null;
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if ([startH, startM, endH, endM].some(n => Number.isNaN(n))) {
    return null;
  }

  return { start: startH * 60 + startM, end: endH * 60 + endM };
}

/**
 * 요일별 그릇 수거 가능 시간 설정을 기준으로 현재 시각이 수거 가능한지 판정합니다.
 *
 * - 오늘 요일의 설정값이 없으면 그 요일은 종일 허용입니다.
 * - 시작 시간 > 종료 시간이면 자정을 넘기는 구간이며, **시작 요일이 구간 전체를 소유**합니다.
 *   (금요일에 23:00~02:00 설정 → 금 23시부터 토 새벽 2시까지 허용)
 *
 * @param todayValue 오늘 요일 설정("HH:MM~HH:MM" 또는 null)
 * @param yesterdayValue 어제 요일 설정 — 자정을 넘겨 오늘 새벽까지 이어지는 구간 판정용
 */
export function isWithinDisposalTime(
  todayValue: string | null,
  yesterdayValue: string | null = null,
  now: Date = new Date(),
): boolean {
  const today = parseTimeWindow(todayValue);

  if (!today) {
    return true; // 미설정 요일 = 종일 허용
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (today.start <= today.end) {
    // 같은 날 범위 (예: 09:00~18:00)
    if (currentMinutes >= today.start && currentMinutes <= today.end) {
      return true;
    }
  } else if (currentMinutes >= today.start) {
    // 오늘 시작된 자정 넘김 구간의 앞부분 (예: 23:00~02:00 의 23시 이후)
    return true;
  }

  // 어제 시작된 자정 넘김 구간의 뒷부분 (예: 어제 23:00~02:00 의 오늘 새벽)
  const yesterday = parseTimeWindow(yesterdayValue);
  return !!yesterday && yesterday.start > yesterday.end && currentMinutes <= yesterday.end;
}

/**
 * 시/분 입력값을 검증해 그대로 돌려줍니다. 범위를 벗어나거나 숫자가 아니면 빈 문자열.
 * 영업시간(자동 품절/해제)과 그릇 수거 시간 저장에서 공용으로 사용합니다.
 */
export function trimTime(time: string, isHour: boolean = true): string {
  const numberTime = parseInt(time);

  if (isNaN(numberTime)) {
    return '';
  }

  if (isHour && (numberTime >= 24 || numberTime < 0)) {
    return '';
  }

  if (!isHour && (numberTime >= 60 || numberTime < 0)) {
    return '';
  }

  return time;
}

