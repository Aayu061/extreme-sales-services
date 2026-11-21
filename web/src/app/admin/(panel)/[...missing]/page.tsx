import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Not found' };
// This page always throws notFound(), so the dev-only instant-navigation check has nothing to check.
export const instant = false;

/**
 * Any /admin address without a screen (R6): shows the admin "not found" inside the admin layout,
 * instead of the public site's page. The answer's status stays 200 (R13: with Cache Components the
 * page has started streaming before notFound(); signed-in only and noindex, so this is accepted).
 */
export default function AdminMissingPage(): never {
  notFound();
}
