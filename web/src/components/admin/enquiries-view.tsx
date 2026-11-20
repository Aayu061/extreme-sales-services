import { loadAdmin } from '@/lib/admin/guard';
import { adminRequest } from '@/lib/admin/pys-admin';
import { ENQUIRY_TABS, enquiriesHref, enquiryTab, enquiryTabParam, tabCounts } from '@/lib/admin/enquiries';
import type { AdminEnquiryLine } from '@/lib/admin/types';
import { EnquiryList } from './enquiry-row';
import { PysUnreachable } from './pys-link';
import { StatusTabs } from './status-tabs';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The AC enquiries screen below its heading (rendered per request, inside <Suspense>). The tab is
 * in the address (?tab=waiting|sent|closed); every other link is built from it alone.
 */
export async function EnquiriesScreen({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const tab = enquiryTabParam((await searchParams).tab);
  const result = await loadAdmin(adminRequest<{ enquiries: AdminEnquiryLine[] }>('GET', '/enquiries'));
  if (!result.ok) return <PysUnreachable retryHref={enquiriesHref(tab)} />;

  const lines = result.data.enquiries;
  const counts = tabCounts(lines);
  const current = ENQUIRY_TABS.find((t) => t.key === tab) ?? ENQUIRY_TABS[0];
  return (
    <>
      <StatusTabs
        label="AC enquiry status"
        current={tab}
        tabs={ENQUIRY_TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key], href: enquiriesHref(t.key) }))}
      />
      <div className="mt-6">
        {/* A new tab starts with no notes from the last one. */}
        <EnquiryList key={tab} lines={lines.filter((line) => enquiryTab(line.status) === tab)} emptyText={current.empty} />
      </div>
    </>
  );
}
