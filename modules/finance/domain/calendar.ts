/** Date-only arithmetic deliberately uses UTC as a calendar, never as a local instant. */
export function isCalendarDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const year = Number(value.slice(0, 4));
    return year >= 1900 && year <= 2100 && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function calendarDate(value: string) {
    if (!isCalendarDate(value))
        throw new RangeError("Unesite ispravan datum (1900–2100).");
    return value;
}
export function todayBelgrade(now: Date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function daysBetween(from: string, to: string) {
    return Math.round((Date.parse(`${calendarDate(to)}T12:00:00Z`) - Date.parse(`${calendarDate(from)}T12:00:00Z`)) / 86400000);
}
export function addDays(date: string, days: number) {
    return new Date(Date.parse(`${calendarDate(date)}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function monthEnd(date: string) {
    calendarDate(date);
    return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0, 12)).toISOString().slice(0, 10);
}
export function monthLength(date: string) { return Number(monthEnd(date).slice(8)); }
/** Local midnight as an instant. Noon is used only for date-only arithmetic above. */
export function belgradeMidnight(date: string): Date {
    calendarDate(date);
    const wall = Date.parse(`${date}T00:00:00Z`);
    let instant = new Date(wall);
    for (let i = 0; i < 2; i++) {
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant);
        const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
        const represented = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
        instant = new Date(wall - (represented - instant.getTime()));
    }
    return instant;
}
