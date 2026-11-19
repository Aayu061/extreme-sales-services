/**
 * Brand names set in type (no manufacturer logos), scrolling slowly. The list is drawn twice so
 * the loop is seamless; the copy is hidden from screen readers, which read the plain list once.
 */
export const BRANDS = ['Daikin', 'Voltas', 'LG', 'Blue Star', 'Hitachi', 'Carrier', 'O General', 'Panasonic', 'Mitsubishi'];

export function BrandStrip({ brands = BRANDS }: { brands?: string[] }) {
  return (
    <div className="marquee relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="marquee-track flex w-max gap-4">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 gap-4">
            {brands.map((brand) => (
              <li
                key={brand}
                className="display inline-flex min-h-16 items-center rounded-full border border-line bg-paper px-7 text-xl whitespace-nowrap text-navy"
              >
                {brand}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
