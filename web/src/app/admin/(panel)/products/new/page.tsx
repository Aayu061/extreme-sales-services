import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductForm } from '@/components/admin/product-form';

export const metadata: Metadata = { title: 'Add a product' };

/** /admin/products/new: add an AC to the shop. After adding, its own page opens. */
export default function AdminNewProductPage() {
  return (
    <>
      <Link href="/admin/products" className="inline-flex min-h-11 items-center font-semibold text-cool underline-offset-4 hover:underline">
        All products
      </Link>
      <h1 className="text-[clamp(28px,4vw,40px)] font-bold text-ink">Add a product</h1>
      <p className="mt-2 max-w-3xl text-muted">Only the name is needed to start. Everything else can be added or changed later.</p>
      <div className="mt-6">
        <ProductForm mode="create" />
      </div>
    </>
  );
}
