const MS_PER_DAY = 86_400_000;

export const relativeDays = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso).getTime();
  const days = Math.floor((now.getTime() - then) / MS_PER_DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export const formatDaysAgo = (days: number | null): string => {
  if (days === null) return "—";
  if (days === 0) return "today";
  return `${days}d`;
};

export const formatElapsed = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};
