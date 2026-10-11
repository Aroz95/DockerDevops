/** Giorno di calendario locale nel formato AAAA-MM-GG (es. "2026-10-11"). */
export function toLocalDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDay(day: string, delta: number): string {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number);
  const value = new Date(year, month - 1, date);
  value.setDate(value.getDate() + delta);
  return toLocalDay(value);
}

/** Il giorno prima di quello indicato, gestendo fine mese e anni bisestili. */
export function previousDay(day: string): string {
  return shiftDay(day, -1);
}

/** Il giorno dopo quello indicato. */
export function nextDay(day: string): string {
  return shiftDay(day, 1);
}
