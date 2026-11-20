/** Sign-in pages: one card in the middle of a plain page (no photo, no effects). */
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
