import { BadgeIndianRupee, Layers, MapPinned, ShieldCheck, Stethoscope, Wrench } from 'lucide-react';
import { Container } from '@/components/site/container';

/**
 * Why ESS, in facts the business has confirmed (no arrival-time promises, no counters, no
 * unverified badges). The warranty line follows business.identity.warrantyDays from PYS.
 */
export function WhyEss({ warrantyDays }: { warrantyDays: number }) {
  const points = [
    { icon: BadgeIndianRupee, title: 'The price before you book', text: 'Every service and AMC plan shows its price with GST, here on the site.' },
    { icon: Stethoscope, title: 'Extra repairs quoted first', text: 'If the technician finds more wrong, you get the price before any work starts.' },
    ...(warrantyDays > 0
      ? [{ icon: ShieldCheck, title: `${warrantyDays}-day warranty*`, text: `Our service work is covered for ${warrantyDays} days.` }]
      : []),
    { icon: MapPinned, title: 'Follow it online', text: 'Your tracking code shows each step, from booked to done.' },
    { icon: Wrench, title: 'All major brands', text: 'Daikin, Voltas, LG, Blue Star, Hitachi, Carrier, O General, Panasonic, Mitsubishi and more.' },
    { icon: Layers, title: 'One request for everything', text: 'A service, an AMC plan and a new AC can go in the same request.' },
  ];
  return (
    <section aria-labelledby="why-heading" className="reveal py-8 sm:py-12">
      <Container>
        <h2 id="why-heading" className="text-[clamp(30px,3.6vw,48px)]">
          Why people call ESS
        </h2>
        <p className="mt-2 max-w-[60ch] text-lg text-muted">AC sales, service and AMC from Chembur, for homes, shops and offices across Mumbai, Thane and Navi Mumbai.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {points.map(({ icon: Icon, title, text }) => (
            <li key={title} className="glass flex gap-4 rounded-3xl p-5 text-ink sm:p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-taxi text-taxi-ink">
                <Icon aria-hidden="true" size={24} />
              </span>
              <span>
                <span className="block text-lg font-bold">{title}</span>
                <span className="mt-1 block text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
