import Link from 'next/link';
import { cookies } from 'next/headers';
import { clearRequestsFilters, searchRequests } from '@/app/admin/actions/requests';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { loadAdmin } from '@/lib/admin/guard';
import { adminRequest } from '@/lib/admin/pys-admin';
import {
  KIND_LABEL,
  REQUEST_KINDS,
  REQUEST_STATUSES,
  REQUESTS_SEARCH_COOKIE,
  STATUS_LABEL,
  hasFilters,
  leadsPath,
  requestsHref,
  requestsQuery,
  type RequestsQuery,
} from '@/lib/admin/requests';
import type { AdminLeadsPage } from '@/lib/admin/types';
import { PysUnreachable } from './pys-link';
import { RequestsTable } from './requests-table';

type SearchParams = Record<string, string | string[] | undefined>;

const linkStyles = 'inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline';

/**
 * The filters. Status, kind and page are kept in the address (?status=&kind=&page=), so a list can
 * be reloaded or shared. The search can be a customer's phone or email, so it is never put in an
 * address: the form posts to a server action that keeps it in a short-lived cookie. Posting works
 * before the page's script has loaded too.
 */
function RequestsFilters({ q }: { q: RequestsQuery }) {
  return (
    <form
      action={searchRequests}
      key={`${requestsHref({ ...q, page: 1 })}|${q.search ?? ''}`}
      className="glass grid gap-4 rounded-[24px] p-4 text-ink md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto] xl:items-start"
    >
      <Field label="Status">
        {({ id }) => (
          <Select id={id} name="status" defaultValue={q.status ?? ''}>
            <option value="">All statuses</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Kind">
        {({ id }) => (
          <Select id={id} name="kind" defaultValue={q.kind ?? ''}>
            <option value="">All kinds</option>
            {REQUEST_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Search" hint="Name, email, request number, tracking code or mobile number.">
        {({ id, describedBy }) => <Input id={id} name="search" type="search" maxLength={100} autoComplete="off" defaultValue={q.search ?? ''} aria-describedby={describedBy} />}
      </Field>
      <div className="flex flex-wrap items-center gap-3 xl:pt-8">
        <Button type="submit" size="md">
          Show requests
        </Button>
        {hasFilters(q) && (
          <button type="submit" formAction={clearRequestsFilters} className={linkStyles}>
            Clear filters
          </button>
        )}
      </div>
    </form>
  );
}

/** "Clear filters" outside the filter form (forgets the saved search as well). */
function ClearFilters() {
  return (
    <form action={clearRequestsFilters}>
      <button type="submit" className={linkStyles}>
        Clear filters
      </button>
    </form>
  );
}

function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="glass rounded-[24px] p-6 text-ink">
      <p className="text-lg font-bold">{title}</p>
      {children}
    </div>
  );
}

function Results({ q, data }: { q: RequestsQuery; data: AdminLeadsPage }) {
  if (data.items.length === 0) {
    if (data.total > 0) {
      return (
        <Empty title="There are no requests on this page.">
          <Link href={requestsHref({ ...q, page: 1 })} className={linkStyles}>
            Go to the first page
          </Link>
        </Empty>
      );
    }
    return hasFilters(q) ? (
      <Empty title="No requests match these filters">
        <p className="mt-1 text-muted">Try another status or kind, or a shorter search.</p>
        <ClearFilters />
      </Empty>
    ) : (
      <Empty title="No requests yet">
        <p className="mt-1 text-muted">Bookings, AC enquiries and messages from the website will show here.</p>
      </Empty>
    );
  }

  const from = (data.page - 1) * data.pageSize + 1;
  const to = from + data.items.length - 1;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <>
      <p className="mb-3 text-muted tabular-nums">
        Showing {from}–{to} of {data.total}
      </p>
      <RequestsTable items={data.items} />
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center gap-3 text-ink">
          {data.page > 1 && (
            <Link href={requestsHref({ ...q, page: data.page - 1 })} className={buttonStyles({ variant: 'glass', size: 'sm' })}>
              Previous page
            </Link>
          )}
          <span className="tabular-nums">
            Page {data.page} of {pages}
          </span>
          {data.page < pages && (
            <Link href={requestsHref({ ...q, page: data.page + 1 })} className={buttonStyles({ variant: 'glass', size: 'sm' })}>
              Next page
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

/** The Requests screen below its heading (rendered per request, inside <Suspense>). Links and Try again never carry the search. */
export async function RequestsScreen({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // Status, kind and page from the address; the search only from the cookie (never the address).
  const q = requestsQuery(await searchParams, (await cookies()).get(REQUESTS_SEARCH_COOKIE)?.value);
  const result = await loadAdmin(adminRequest<AdminLeadsPage>('GET', leadsPath(q)));
  return (
    <>
      <RequestsFilters q={q} />
      <div className="mt-6">{result.ok ? <Results q={q} data={result.data} /> : <PysUnreachable retryHref={requestsHref(q)} />}</div>
    </>
  );
}
