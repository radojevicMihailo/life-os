const timeInBelgrade = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Belgrade",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// Date-only task inputs are stored as timestamps at local midnight.
export function taskDateHasTime(date: Date): boolean {
  return timeInBelgrade.format(date) !== "00:00:00";
}
