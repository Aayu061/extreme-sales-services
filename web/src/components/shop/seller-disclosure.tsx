import type { SellerDisclosure as Seller } from '@/lib/pys/types';

/**
 * Who sells this AC, as the Consumer Protection (E-Commerce) Rules 2020 require: name, address,
 * GSTIN, contact, grievance officer and return policy. Missing details are simply left out.
 */
export function SellerDisclosure({ seller }: { seller: Seller }) {
  const g = seller.grievanceOfficer;
  const rows: Array<[string, string | null]> = [
    ['Registered name', seller.legalName !== seller.name ? seller.legalName : null],
    ['Address', seller.address],
    ['GSTIN', seller.gstin],
    ['Phone', seller.phone],
    ['Email', seller.email],
  ];
  const grievance = [g.name, g.email, g.phone].filter(Boolean).join(' · ');

  return (
    <section aria-labelledby="sold-by" className="glass rounded-3xl p-6 text-ink">
      <h2 id="sold-by" className="text-2xl">
        Sold by
      </h2>
      <p className="mt-2 text-lg font-bold">{seller.name}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="tabular break-words">{v}</dd>
            </div>
          ))}
        {grievance && (
          <div className="contents">
            <dt className="text-muted">Grievance officer</dt>
            <dd className="break-words">{grievance}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-sm">{seller.returnPolicy ?? "Returns: ask us before you buy; we will explain the brand's policy."}</p>
    </section>
  );
}
