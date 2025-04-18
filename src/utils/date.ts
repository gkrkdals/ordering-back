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

