import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Not found' };
// This page always throws notFound(), so the dev-only instant-navigation check has nothing to check.
export const instant = false;

/**
 * Any /admin address without a screen (R6): shows the admin "not found" inside the admin layout,
 * instead of the public site's page. The proxy has already answered 404 for it.
 */
export default function AdminMissingPage(): never {
  notFound();
}
