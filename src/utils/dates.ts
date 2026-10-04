export function isValidDeadline(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00');
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10));
}

export function formatDeadline(value: string, short = false): string {
  return new Date(value + 'T12:00:00').toLocaleDateString('en-US', {
    month: short ? 'short' : 'long', day: 'numeric', ...(short ? {} : { year: 'numeric' }),
  });
}

export function isOverdue(deadline: string, now = new Date()): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(deadline + 'T00:00:00') < today;
}
