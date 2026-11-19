/**
 * Old site addresses (static HTML pages, served with and without ".html") → new pages, so saved
 * links and search results keep working after the switch. Clean addresses that are real new
 * pages (/amc, /contact, /admin) are never redirected.
 */
export interface LegacyRedirect {
  source: string;
  destination: string;
  permanent: true;
}

const BOTH_FORMS: Array<[string, string]> = [
  ['index', '/'],
  ['service', '/services'],
  ['products', '/shop'],
  ['status', '/track'],
  ['privacy', '/legal/privacy'],
  ['terms', '/legal/terms'],
  ['vendor', '/sell'],
  ['customer-portal', '/account'],
  ['login', '/account'],
  ['staff', '/admin'],
];

const HTML_ONLY: Array<[string, string]> = [
  ['amc', '/amc'],
  ['contact', '/contact'],
  ['admin', '/admin'],
  ['404', '/'],
];

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  ...BOTH_FORMS.flatMap(([page, destination]) => [
    { source: `/${page}.html`, destination, permanent: true as const },
    { source: `/${page}`, destination, permanent: true as const },
  ]),
  ...HTML_ONLY.map(([page, destination]) => ({ source: `/${page}.html`, destination, permanent: true as const })),
];
