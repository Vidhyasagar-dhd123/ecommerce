import { format, parseISO, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

/** "28 Aug 2026" */
export const formatDate = (iso: string) => {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd MMM yyyy');
  } catch {
    return String(iso);
  }
};

/** "28 Aug 2026, 02:30 PM" */
export const formatDateTime = (iso: string) => {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd MMM yyyy, hh:mm a');
  } catch {
    return String(iso);
  }
};

/** "3 days ago" */
export const timeAgo = (iso: string) =>
  formatDistanceToNow(parseISO(iso), { addSuffix: true });

/** "August 2026" — for profile join date */
export const formatMonthYear = (iso: string) => format(parseISO(iso), 'MMMM yyyy');

/** Days until expiry — for offers/dues */
export const daysUntil = (iso: string) => {
  const diff = parseISO(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const isExpired = (iso: string) => isBefore(parseISO(iso), new Date());
export const isActive = (start: string, end: string) =>
  isBefore(parseISO(start), new Date()) && isAfter(parseISO(end), new Date());
