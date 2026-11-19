import { formatDate } from '@/lib/format';
import type { TrackResult } from '@/lib/pys/types';

export const ITEM_STATUS_LABEL: Record<TrackResult['items'][number]['status'], string> = {
  PENDING: 'Waiting for confirmation',
  CONFIRMED: 'Confirmed',
  SELLER_WILL_QUOTE: 'Seller will send a price',
  DONE: 'Done',
  NOT_ACCEPTED: 'Not accepted',
  CANCELLED: 'Cancelled',
};

export const SLOT_LABEL: Record<string, string> = {
  MORNING: 'Morning (9–12)',
  AFTERNOON: 'Afternoon (12–4)',
  EVENING: 'Evening (4–7)',
};

/** The six main steps from PYS, each marked done / current / still to come. */
export function timelineSteps(r: TrackResult): Array<{ step: number; label: string; state: 'done' | 'current' | 'todo' }> {
  return r.steps.map((s) => ({ ...s, state: s.step < r.status.step ? 'done' : s.step === r.status.step ? 'current' : 'todo' }));
}

/** "Wed, 25 Nov 2026, 10:00–12:00 · Technician: Ravi" (parts not known yet are left out). */
export function visitText(r: TrackResult): string | null {
  if (!r.visit) return null;
  const v = r.visit;
  let text = formatDate(v.date) ?? v.date;
  if (v.startTime) text += `, ${v.startTime}${v.endTime ? `–${v.endTime}` : ''}`;
  if (v.technicianFirstName) text += ` · Technician: ${v.technicianFirstName}`;
  return text;
}
