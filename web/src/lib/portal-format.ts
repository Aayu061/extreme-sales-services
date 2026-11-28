import { formatDate } from '@/lib/format';
import type { CustomerStatus } from '@/lib/pys/types';

/**
 * S11b: the words and numbers customers see in their account. PYS sends raw codes (SPLIT, ACTIVE, DRY_SERVICE …);
 * these turn them into plain English, with a readable fallback for any code added later.
 */

export type Tone = CustomerStatus['tone'];
export interface Badge {
  label: string;
  tone: Tone;
}

/** Acronyms that stay in capitals when a code is turned into words. */
const KEEP_CAPS = new Set(['AC', 'AMC', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'GST', 'PCB', 'VRF', 'VRV', 'SR']);

/** "EXPIRING_SOON" → "Expiring soon"; "AMC_SERVICE" → "AMC service". Empty → ''. */
export function humanize(code: string | null | undefined): string {
  if (!code) return '';
  const words = String(code).trim().replace(/[_\s-]+/g, ' ').split(' ').filter(Boolean);
  return words
    .map((w, i) => {
      const upper = w.toUpperCase();
      if (KEEP_CAPS.has(upper)) return upper;
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}

/** A code ("NEEDS_ATTENTION") becomes words; text a technician typed is shown as written. */
export function readable(v: string | null | undefined): string | null {
  if (!v) return null;
  return /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(v.trim()) ? humanize(v) : v.trim();
}

const AC_TYPE: Record<string, string> = {
  SPLIT: 'Split AC',
  WINDOW: 'Window AC',
  CASSETTE: 'Cassette AC',
  TOWER: 'Floor-standing AC',
  FLOOR_STANDING: 'Floor-standing AC',
  TOWER_AC: 'Floor-standing AC',
  DUCTABLE: 'Ductable AC',
  DUCTED: 'Ductable AC',
  PORTABLE: 'Portable AC',
  VRF: 'VRF system',
  VRV: 'VRV system',
  CENTRAL: 'Central AC',
};

/** "SPLIT" → "Split AC". Unknown codes read as words with "AC" added; nothing → "AC". */
export function acTypeLabel(type: string | null | undefined): string {
  if (!type) return 'AC';
  const code = type.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!code || code === 'UNKNOWN' || code === 'OTHER') return 'AC';
  if (AC_TYPE[code]) return AC_TYPE[code];
  const words = humanize(code);
  return /\bAC$/.test(words) ? words : `${words} AC`;
}

const TECHNOLOGY: Record<string, string> = { INVERTER: 'Inverter', NON_INVERTER: 'Non-inverter', FIXED_SPEED: 'Non-inverter' };
export function technologyLabel(v: string | null | undefined): string | null {
  if (!v) return null;
  return TECHNOLOGY[v.toUpperCase()] ?? humanize(v);
}

/** 1.5 → "1.5 ton". */
export function tonsText(tons: number | null | undefined): string | null {
  return typeof tons === 'number' && tons > 0 ? `${tons} ton` : null;
}

/** "5" or "5_STAR" → "5 star". */
export function starRatingText(v: string | null | undefined): string | null {
  if (!v) return null;
  const n = /^(\d(?:\.\d)?)/.exec(v.trim());
  return n ? `${n[1]} star` : humanize(v);
}

/** "Daikin 1.5 ton Split AC" from the parts PYS sends. */
export function acTitle(ac: { brand?: string | null; tons?: number | null; type?: string | null }): string {
  return [ac.brand, tonsText(ac.tons), acTypeLabel(ac.type)].filter(Boolean).join(' ');
}

/** Status words for contracts, visits and the like: "ACTIVE" → "Active", "EXPIRING_SOON" → "Expiring soon". */
export function statusLabel(code: string | null | undefined): string {
  return humanize(code) || 'Unknown';
}

const AMC_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'success',
  EXPIRING_SOON: 'warning',
  EXPIRED: 'neutral',
  RENEWED: 'info',
  CANCELLED: 'neutral',
  PENDING: 'info',
  DRAFT: 'neutral',
  SUSPENDED: 'warning',
};
export function amcStatusBadge(code: string): Badge {
  return { label: statusLabel(code), tone: AMC_STATUS_TONE[code?.toUpperCase()] ?? 'neutral' };
}

const REQUEST_TYPE: Record<string, string> = {
  REPAIR: 'Repair',
  BREAKDOWN: 'Breakdown',
  GENERAL_SERVICE: 'General service',
  PREVENTIVE_MAINTENANCE: 'Preventive maintenance',
  INSTALLATION: 'Installation',
  UNINSTALLATION: 'Uninstallation',
  REINSTALLATION: 'Reinstallation',
  COMPLAINT: 'Complaint',
  AMC_SERVICE: 'AMC service',
  AMC_VISIT: 'AMC visit',
  GAS_CHARGING: 'Gas charging',
  INSPECTION: 'Inspection',
  SITE_SURVEY: 'Site survey',
  WARRANTY: 'Warranty service',
};
/** "GENERAL_SERVICE" → "General service"; nothing → "Service request". */
export function requestTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Service request';
  return REQUEST_TYPE[type.toUpperCase()] ?? humanize(type);
}

const SERVICE_TYPE: Record<string, string> = {
  DRY_SERVICE: 'Dry service',
  JET_SERVICE: 'Jet service',
  WET_SERVICE: 'Jet service',
  PUMPDOWN_SERVICE: 'Pump-down service',
  PUMP_DOWN_SERVICE: 'Pump-down service',
  FOAM_SERVICE: 'Foam service',
  REPAIR: 'Repair',
  GENERAL_SERVICE: 'General service',
  PREVENTIVE_MAINTENANCE: 'Preventive maintenance',
  BREAKDOWN: 'Breakdown',
  INSTALLATION: 'Installation',
  GAS_CHARGING: 'Gas charging',
};
/** "PUMPDOWN_SERVICE" → "Pump-down service"; nothing → null. */
export function serviceTypeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return SERVICE_TYPE[type.toUpperCase()] ?? humanize(type);
}

export type Coverage = 'UNDER_WARRANTY' | 'AMC_COVERED' | 'EXPIRING_SOON' | 'OUT_OF_WARRANTY' | 'EXPIRED' | null;
const COVERAGE: Record<string, Badge> = {
  UNDER_WARRANTY: { label: 'Under warranty', tone: 'success' },
  AMC_COVERED: { label: 'AMC covered', tone: 'info' },
  EXPIRING_SOON: { label: 'Warranty ending soon', tone: 'warning' },
  OUT_OF_WARRANTY: { label: 'Out of warranty', tone: 'neutral' },
  EXPIRED: { label: 'Warranty ended', tone: 'neutral' },
};
/** The badge on an AC card; null when PYS does not know the cover. */
export function coverageBadge(c: string | null | undefined): Badge | null {
  if (!c) return null;
  return COVERAGE[c.toUpperCase()] ?? { label: humanize(c), tone: 'neutral' };
}

export type BillStatus = 'PAID' | 'PART_PAID' | 'DUE';
const BILL: Record<BillStatus, Badge> = {
  PAID: { label: 'Paid', tone: 'success' },
  PART_PAID: { label: 'Part paid', tone: 'warning' },
  DUE: { label: 'Due', tone: 'danger' },
};
export function billStatusBadge(s: string): Badge {
  return BILL[s as BillStatus] ?? { label: humanize(s), tone: 'neutral' };
}

const VISIT_STATE: Record<string, Badge> = {
  DONE: { label: 'Done', tone: 'success' },
  UPCOMING: { label: 'Upcoming', tone: 'progress' },
  PLANNED: { label: 'Planned', tone: 'neutral' },
  MISSED: { label: 'Missed', tone: 'warning' },
  SCHEDULED: { label: 'Scheduled', tone: 'progress' },
  COMPLETED: { label: 'Done', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  RESCHEDULED: { label: 'Rescheduled', tone: 'info' },
};
export function visitStateBadge(s: string | null | undefined): Badge {
  if (!s) return { label: 'Planned', tone: 'neutral' };
  return VISIT_STATE[s.toUpperCase()] ?? { label: humanize(s), tone: 'neutral' };
}

const METHOD: Record<string, string> = {
  UPI: 'UPI',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  IMPS: 'IMPS',
  ONLINE: 'Online',
};
export function paymentMethodLabel(m: string | null | undefined): string {
  if (!m) return '—';
  return METHOD[m.toUpperCase()] ?? humanize(m);
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Bills always show paise: 7998 → "₹7,998.00"; 141482.5 → "₹1,41,482.50"; -500 → "-₹500.00". */
export function formatRupees(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return rupees.format(Object.is(n, -0) ? 0 : n);
}

/** "Tue, 1 Dec 2026" (India time). Re-exported so account pages use one module. */
export { formatDate };

const shortDateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
/** "2026-10-04" → "4 Oct 2026" (for photo descriptions and tight spaces). */
export function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const part = (type: string) => shortDateFmt.formatToParts(d).find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')}`;
}

/** "2026-12" or "2026-12-01" → "Dec 2026". */
export function formatMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})/.exec(value);
  if (!m) return value;
  const d = new Date(`${m[1]}-${m[2]}-15T00:00:00+05:30`);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d);
}

/** "11:00" / "11:00:00" → "11:00 am"; "14:30" → "2:30 pm"; an ISO timestamp → its India time. */
export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (m) {
    const h = Number(m[1]);
    if (h > 23 || Number(m[2]) > 59) return null;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    .format(d)
    .replace(/\s?(AM|PM)$/i, (_, ap: string) => ` ${ap.toLowerCase()}`);
}

/** "Tue, 1 Dec 2026, 11:00 am" (date and an optional time). */
export function formatDateTime(date: string | null | undefined, time?: string | null): string | null {
  const d = formatDate(date);
  if (!d) return null;
  const t = formatTime(time ?? null);
  return t ? `${d}, ${t}` : d;
}

/** A serial shown in a list: "••••1234". */
export function maskedSerial(last4: string | null | undefined): string | null {
  return last4 ? `••••${last4}` : null;
}

/** "2 of 4 left" / "3 left" / "2 used" for AMC visits. */
export function visitsLeftText(v: { totalVisits?: number | null; visitsUsed: number; visitsLeft?: number | null }): string {
  if (typeof v.visitsLeft === 'number') return v.totalVisits ? `${v.visitsLeft} of ${v.totalVisits} left` : `${v.visitsLeft} left`;
  return `${v.visitsUsed} used`;
}

/**
 * Warranty visits on an AC page. PYS does not count warranty visits used yet (it sends null), so then only the
 * total is shown: "2 visits included" rather than a made-up "0 used".
 */
export function warrantyVisitsText(w: { visitsTotal: number | null; visitsUsed: number | null }): string | null {
  if (typeof w.visitsTotal !== 'number' || w.visitsTotal <= 0) return null;
  if (typeof w.visitsUsed !== 'number') return `${w.visitsTotal} visit${w.visitsTotal === 1 ? '' : 's'} included`;
  return `${w.visitsUsed} used, ${Math.max(0, w.visitsTotal - w.visitsUsed)} left of ${w.visitsTotal}`;
}

/** Today in India as YYYY-MM-DD (the dates PYS sends are India dates). */
export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * The AC is under a live AMC: an active (or ending soon) contract whose end date has not passed. The status alone is
 * not enough, because PYS may not have marked an ended contract EXPIRED yet (PYS's own rule also checks the date).
 */
export function amcCoversToday(contracts: Array<{ status: string; endDate: string | null }>, today: string = istToday()): boolean {
  return contracts.some((c) => ['ACTIVE', 'EXPIRING_SOON'].includes(c.status.toUpperCase()) && (!c.endDate || c.endDate >= today));
}

/** "1 AC" / "3 ACs". */
export function acCountText(n: number): string {
  return `${n} AC${n === 1 ? '' : 's'}`;
}

/** "2.5 kg" for gas added. */
export function kgText(kg: number | null | undefined): string | null {
  return typeof kg === 'number' && kg > 0 ? `${kg} kg` : null;
}
