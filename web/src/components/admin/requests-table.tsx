import { StatusBadge } from '@/components/ui/status-badge';
import { formatReceived, kindLabel, statusLabel } from '@/lib/admin/requests';
import type { AdminLead } from '@/lib/admin/types';
import { PysLink } from './pys-link';

/**
 * Website requests, read-only (approving happens in PYS). A table on wide screens (xl, beside the
 * menu); stacked cards below that (one column on phones), so nothing scrolls sideways. Only one of
 * the two is ever displayed (the other is display:none, so screen readers get it once). Phone and
 * email are not shown here.
 */
export function RequestsTable({ items }: { items: AdminLead[] }) {
  return (
    <>
      <div className="glass hidden overflow-x-auto rounded-[24px] xl:block">
        <table className="w-full text-left text-ink">
          <thead>
            <tr className="text-sm text-muted">
              <th scope="col" className="px-3 py-3 font-semibold">
                Number
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Kind
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Name
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Received
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Approve in PYS
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-line align-middle">
                <td className="px-3 py-2 font-semibold whitespace-nowrap tabular-nums">{it.intakeNumber}</td>
                <td className="px-3 py-2">{kindLabel(it.kind)}</td>
                <td className="px-3 py-2 break-words">{it.contact.name}</td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatReceived(it.createdAt)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={statusLabel(it.status)} className="whitespace-nowrap" />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <PysLink label={`Open in PYS: ${it.intakeNumber}`}>Open in PYS</PysLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
        {items.map((it) => (
          <li key={it.id} className="glass rounded-[24px] p-4 text-ink">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold tabular-nums">{it.intakeNumber}</span>
              <StatusBadge status={statusLabel(it.status)} />
            </div>
            <p className="mt-2 font-semibold break-words">{it.contact.name}</p>
            <p className="text-sm text-muted">
              {kindLabel(it.kind)} · <span className="tabular-nums">{formatReceived(it.createdAt)}</span>
            </p>
            <PysLink label={`Open in PYS: ${it.intakeNumber}`} className="mt-1">
              Open in PYS
            </PysLink>
          </li>
        ))}
      </ul>
    </>
  );
}
