'use server';

import { accountToken, isPortalRef, portalGet, portalPath } from '@/lib/account';
import type { PortalAcDetail, PortalOverview } from '@/lib/portal-types';

/** What the booking form may fill in for a signed-in customer (only into fields that are still empty). */
export interface BookingPrefill {
  name: string;
  phone: string;
  email: string;
  /** The service address of the AC the customer booked for (from "Book a service" on an AC page). */
  addressLine: string;
  city: 'Mumbai' | 'Thane' | 'Navi Mumbai' | null;
}

const CITIES = ['Mumbai', 'Thane', 'Navi Mumbai'] as const;

/** "+91 98765 43210" -> "9876543210" (the booking form wants the 10-digit mobile). */
function mobileOf(v: string | null): string {
  const d = (v ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : '';
}

/**
 * The signed-in customer's details for the booking form, or null when nobody is signed in (or PYS cannot say). The
 * customer comes only from the session cookie; `acId` only picks which of their own ACs' address to use (PYS answers
 * 404 for anyone else's).
 */
export async function bookingPrefill(acId?: string | null): Promise<BookingPrefill | null> {
  if (!(await accountToken())) return null;
  const overview = await portalGet<PortalOverview>('/portal/overview');
  if (overview.kind !== 'ok') return null;
  const c = overview.data.customer;
  let addressLine = '';
  if (acId && isPortalRef(acId)) {
    const ac = await portalGet<PortalAcDetail>(portalPath('/portal/acs', acId), { detail: true });
    if (ac.kind === 'ok') addressLine = (ac.data.ac.site?.address ?? '').trim().slice(0, 300);
  }
  const city = CITIES.find((x) => x.toLowerCase() === (c.city ?? '').trim().toLowerCase()) ?? null;
  return { name: (c.name ?? '').trim().slice(0, 120), phone: mobileOf(c.phone), email: (c.email ?? '').trim(), addressLine, city };
}
