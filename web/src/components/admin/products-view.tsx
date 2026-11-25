import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { loadAdmin } from '@/lib/admin/guard';
import { adminRequest } from '@/lib/admin/pys-admin';
import { SHOWN_FILTER_LABEL, editHref, filterAdminProducts, productsHref, productsQuery, type ProductsQuery, type ShownFilter } from '@/lib/admin/product-form';
import type { AdminProduct } from '@/lib/admin/types';
import { ProductForm } from './product-form';
import { ProductsTable } from './products-table';
import { PysUnreachable } from './pys-link';

type SearchParams = Record<string, string | string[] | undefined>;

const linkStyles = 'inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline';

const listProducts = () => adminRequest<{ products: AdminProduct[] }>('GET', '/products');

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Search and shown/hidden filter. These are about products (not customers), so they are kept in
 * the address (?q=&show=) and the form is a plain GET.
 */
function ProductsFilters({ query }: { query: ProductsQuery }) {
  return (
    <form
      role="search"
      aria-label="Find products"
      method="get"
      action="/admin/products"
      className="glass grid gap-4 rounded-[24px] p-4 text-ink md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-start"
    >
      <Field label="Search" hint="Name, brand, model number or product ID.">
        {({ id, describedBy }) => <Input id={id} name="q" type="search" maxLength={100} defaultValue={query.q} aria-describedby={describedBy} />}
      </Field>
      <Field label="On the website">
        {({ id }) => (
          <Select id={id} name="show" defaultValue={query.show}>
            {(Object.keys(SHOWN_FILTER_LABEL) as ShownFilter[]).map((key) => (
              <option key={key} value={key}>
                {SHOWN_FILTER_LABEL[key]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-3 md:pt-8">
        <Button type="submit">Show products</Button>
        {(query.q || query.show !== 'all') && (
          <Link href="/admin/products" className={linkStyles}>
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}

/** The Products list below its heading (rendered per request, inside <Suspense>). */
export async function ProductsScreen({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = productsQuery(await searchParams);
  const result = await loadAdmin(listProducts());
  if (!result.ok) return <PysUnreachable retryHref={productsHref(query)} />;

  const all = result.data.products;
  const shown = all.filter((p) => p.isPublished).length;
  const list = filterAdminProducts(all, query);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted tabular-nums">
          {plural(all.length, 'product', 'products')} · {shown} shown · {all.length - shown} hidden
        </p>
        <ButtonLink href="/admin/products/new" size="sm">
          Add a product
        </ButtonLink>
      </div>
      <ProductsFilters query={query} />
      {all.length > 0 ? (
        <ProductsTable
          products={list}
          filtered={query.show !== 'all'}
          empty={
            <div className="glass rounded-[24px] p-6 text-ink">
              <p className="text-lg font-bold">No products match</p>
              <p className="mt-1 text-muted">Try a shorter search, or another choice under &ldquo;On the website&rdquo;.</p>
              <Link href="/admin/products" className={linkStyles}>
                Show all products
              </Link>
            </div>
          }
        />
      ) : (
        <div className="glass rounded-[24px] p-6 text-ink">
          <p className="text-lg font-bold">No products yet</p>
          <p className="mt-1 text-muted">ACs you add here appear in the shop.</p>
        </div>
      )}
    </div>
  );
}

const decode = (id: string) => {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
};

/**
 * One product's page: its name, the form and the live preview card. PYS has no "one product"
 * read, so the list is read and the product found in it; an unknown id shows the admin "not found".
 */
export async function ProductEditScreen({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const id = decode((await params).id);
  const added = (await searchParams).added === '1';
  const result = await loadAdmin(listProducts());
  if (!result.ok) return <PysUnreachable retryHref={editHref(id)} />;
  const product = result.data.products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <>
      <h1 className="text-[clamp(26px,3.6vw,36px)] font-bold break-words text-ink">{product.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
        <span className="tabular-nums">Product ID: {product.id}</span>
        {product.isPublished ? (
          <a href={`/shop/${encodeURIComponent(product.id)}`} target="_blank" rel="noopener noreferrer" aria-label="See it in the shop (opens in a new tab)" className={linkStyles}>
            See it in the shop
            <ExternalLink aria-hidden="true" size={16} className="ml-1 shrink-0" />
          </a>
        ) : (
          <span className="font-semibold text-heat-text">Hidden from the website</span>
        )}
      </div>
      <div className="mt-6">
        <ProductForm mode="edit" product={product} added={added} />
      </div>
    </>
  );
}
