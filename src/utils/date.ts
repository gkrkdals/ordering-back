export function dateToString(origin: Date) {
  const year = origin.getFullYear();
  const month = origin.getMonth() + 1;
  const day = origin.getDate();
  const hour = origin.getHours();
  const minute = origin.getMinutes();
  const second = origin.getSeconds();

  return `${year}-${('00' + month).slice(-2)}-${('00' + day).slice(-2)} ${('00' + hour).slice(-2)}:${('00' + minute).slice(-2)}:${('00' + second).slice(-2)}`;
}

export function getYesterday(origin: string) {
  const now = new Date(origin);
  now.setDate(now.getDate() - 1);
  now.setHours(12, 0, 0, 0);
  return dateToString(now);
}