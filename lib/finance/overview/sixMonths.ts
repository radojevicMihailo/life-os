function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function sixMonthRange(
  todayIso: string,
): Array<{ month: string; from: string; to: string }> {
  const year = Number(todayIso.slice(0, 4));
  const month1 = Number(todayIso.slice(5, 7));
  const result: Array<{ month: string; from: string; to: string }> = [];
  for (let i = 5; i >= 0; i--) {
    let m = month1 - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const last = lastDayOfMonth(y, m);
    result.push({
      month: `${y}-${pad(m)}`,
      from: `${y}-${pad(m)}-01`,
      to: `${y}-${pad(m)}-${pad(last)}`,
    });
  }
  return result;
}
