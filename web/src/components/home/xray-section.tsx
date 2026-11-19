'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Container } from '@/components/site/container';
import { buttonStyles } from '@/components/ui/button';
import type { PickerService } from '@/lib/answer';
import { cn } from '@/lib/cn';
import { servicePriceText } from '@/lib/format';
import { groupServices } from '@/lib/services';
import { XRAY_IMAGE, XRAY_PARTS, clipPolygon, partAnswer, type XrayPart } from '@/lib/xray-parts';

gsap.registerPlugin(useGSAP);

const REDUCE = '(prefers-reduced-motion: reduce)';
const DESKTOP = '(min-width: 761px)';
const IMG_SIZES = '(min-width: 1024px) 64vw, 100vw';

const centroid = (outline: XrayPart['outline']) => [
  outline.reduce((s, p) => s + p[0], 0) / outline.length,
  outline.reduce((s, p) => s + p[1], 0) / outline.length,
];

/**
 * "Point at the problem": the owner's see-through AC. Tapping a part scans the AC, lifts that
 * part out with a glowing outline and shows the problem, the service and its live price. A list
 * view shows every service (default for people who turn animations off).
 */
export function XraySection({ services }: { services: PickerService[] }) {
  const [view, setView] = useState<'xray' | 'list'>('xray');
  const [selected, setSelected] = useState<XrayPart | null>(null);
  const root = useRef<HTMLElement>(null);
  const layers = useRef<Record<string, HTMLDivElement | null>>({});
  const edges = useRef<Record<string, SVGPolygonElement | null>>({});
  const reduce = useRef(false);

  // People who turn animations off start in the list view.
  useEffect(() => {
    reduce.current = window.matchMedia(REDUCE).matches;
    if (reduce.current) setView('list');
  }, []);

  useGSAP(
    () => {
      if (view !== 'xray' || reduce.current || !window.matchMedia(DESKTOP).matches) return;
      gsap.registerPlugin(ScrollTrigger);
      // Desktop: the parts light up one by one as the AC scrolls into view (no pinning, no gap).
      gsap.from('.xray-hot', {
        scale: 0,
        opacity: 0,
        stagger: 0.15,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '.xray-stage', start: 'top 80%', once: true },
      });
    },
    { scope: root, dependencies: [view] },
  );

  const release = (p: XrayPart) => {
    const layer = layers.current[p.id];
    const edge = edges.current[p.id];
    if (!layer || !edge) return;
    gsap.killTweensOf([layer, edge]);
    gsap.to(layer, { x: 0, y: 0, scale: 1, rotationX: 0, opacity: 0, duration: 0.4, ease: 'power3.inOut' });
    gsap.to(edge, { opacity: 0, duration: 0.25 });
  };

  function select(p: XrayPart) {
    if (selected?.id === p.id) return;
    if (selected) release(selected);
    setSelected(p);
    const layer = layers.current[p.id];
    const edge = edges.current[p.id];
    if (!layer || !edge) return;
    const len = edge.getTotalLength?.() ?? 2000;
    const stage = root.current?.querySelector<HTMLElement>('.xray-ac');
    const k = stage ? stage.clientWidth / XRAY_IMAGE.w : 1;
    const to = { x: p.lift[0] * 1.6 * k, y: p.lift[1] * 1.6 * k, scale: 1.12, rotationX: 10, opacity: 1 };
    if (reduce.current) {
      gsap.set(layer, to);
      gsap.set(edge, { opacity: 1, strokeDasharray: len, strokeDashoffset: 0 });
      return;
    }
    gsap
      .timeline()
      .set('.xray-beam', { left: '-20%', opacity: 1 })
      .to('.xray-beam', { left: '105%', duration: 0.7, ease: 'power1.inOut' })
      .to('.xray-beam', { opacity: 0, duration: 0.15 }, '-=0.15')
      .set(layer, { opacity: 1 }, 0.35)
      .to(layer, { ...to, duration: 0.7, ease: 'back.out(1.6)' }, 0.35)
      .set(edge, { opacity: 1, strokeDasharray: len }, 0.4)
      .fromTo(edge, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' }, 0.4)
      .fromTo('.xray-card', { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.55);
    gsap.to(layer, { y: `+=${6 * k}`, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.1 });
  }

  const answer = selected ? partAnswer(selected, services) : null;
  const groups = groupServices(services);

  return (
    <section ref={root} id="services" aria-labelledby="xray-heading" className="py-12 sm:py-16">
      <div className="xray-wrap">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="xray-heading" className="text-[clamp(32px,4vw,54px)]">
                Point at the problem.
              </h2>
              <p className="mt-2 max-w-[60ch] text-lg text-muted">Tap any part of the AC. We show what goes wrong there, how we fix it and the price.</p>
            </div>
            <div role="group" aria-label="How to show services" className="neu-inset flex rounded-full p-1">
              {(['xray', 'list'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn('min-h-10 rounded-full px-4 text-sm font-bold transition-colors', view === v ? 'neu-raised text-ink' : 'text-muted')}
                >
                  {v === 'xray' ? 'AC X-ray' : 'List'}
                </button>
              ))}
            </div>
          </div>

          {view === 'xray' ? (
            <>
              <div className="mt-6 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="xray-stage relative overflow-hidden rounded-[28px] bg-[radial-gradient(80%_70%_at_50%_45%,color-mix(in_oklab,var(--cool)_16%,#0a1630),#0a1630)] p-[3%] shadow-[inset_0_0_0_1px_var(--glass-line)] [background-image:linear-gradient(rgb(92_200_255/.07)_1px,transparent_1px),linear-gradient(90deg,rgb(92_200_255/.07)_1px,transparent_1px)] [background-size:28px_28px] dark:bg-[#0a1630]">
                  <div className="xray-ac relative [perspective:1400px]" style={{ aspectRatio: `${XRAY_IMAGE.w} / ${XRAY_IMAGE.h}` }}>
                    <Image
                      src={XRAY_IMAGE.src}
                      alt="See-through view of a split AC indoor unit showing its filter, coil, fan, circuit board, gas pipes and drain tray"
                      width={XRAY_IMAGE.w}
                      height={XRAY_IMAGE.h}
                      sizes={IMG_SIZES}
                      className={cn(
                        'absolute inset-0 size-full transition-[filter,transform] duration-500',
                        selected && 'scale-[.985] brightness-[.38] saturate-[.35] blur-[.6px]',
                      )}
                    />
                    <div aria-hidden="true" className="xray-beam pointer-events-none absolute -top-[4%] -bottom-[4%] -left-[20%] z-[4] w-[16%] bg-[linear-gradient(90deg,transparent,rgb(120_220_255/.08)_40%,rgb(170_240_255/.55)_50%,rgb(120_220_255/.08)_60%,transparent)] opacity-0 mix-blend-screen" />
                    <p aria-hidden="true" className="absolute top-[5%] left-[4%] z-[6] font-mono text-xs font-bold tracking-wider text-[#bfefff]">
                      {selected ? `${selected.label} selected` : 'Tap a glowing dot'}
                    </p>
                    {XRAY_PARTS.map((p) => {
                      const [cx, cy] = centroid(p.outline);
                      return (
                        <div
                          key={p.id}
                          ref={(el) => {
                            layers.current[p.id] = el;
                          }}
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 z-[3] opacity-0 [transform-style:preserve-3d]"
                          style={{ transformOrigin: `${(cx / XRAY_IMAGE.w) * 100}% ${(cy / XRAY_IMAGE.h) * 100}%` }}
                        >
                          <div className="absolute inset-0" style={{ clipPath: clipPolygon(p.outline) }}>
                            <Image src={XRAY_IMAGE.src} alt="" width={XRAY_IMAGE.w} height={XRAY_IMAGE.h} sizes={IMG_SIZES} className="size-full" />
                          </div>
                          <svg viewBox={`0 0 ${XRAY_IMAGE.w} ${XRAY_IMAGE.h}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                            <polygon
                              ref={(el) => {
                                edges.current[p.id] = el;
                              }}
                              points={p.outline.map((q) => q.join(',')).join(' ')}
                              fill="none"
                              stroke="#5cc8ff"
                              strokeWidth={3}
                              vectorEffect="non-scaling-stroke"
                              opacity={0}
                              style={{ filter: 'drop-shadow(0 0 6px #5cc8ff)' }}
                            />
                          </svg>
                        </div>
                      );
                    })}
                    {XRAY_PARTS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-label={p.label}
                        aria-pressed={selected?.id === p.id}
                        onClick={() => select(p)}
                        className={cn(
                          'xray-hot absolute z-[5] -mt-[17px] -ml-[17px] size-[34px] rounded-full bg-[radial-gradient(circle,#fff_0_22%,#5cc8ff_24%_40%,transparent_42%)] shadow-[0_0_0_1px_rgb(255_255_255/.6)] max-[760px]:-mt-[14px] max-[760px]:-ml-[14px] max-[760px]:size-7',
                          "after:absolute after:-inset-1.5 after:animate-ping after:rounded-full after:border-2 after:border-[#5cc8ff] after:content-['']",
                          selected && selected.id !== p.id && 'opacity-25',
                        )}
                        style={{ left: `${p.spot[0] * 100}%`, top: `${p.spot[1] * 100}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div aria-live="polite" className="xray-card glass rounded-3xl p-[22px] text-ink lg:min-h-[250px]">
                  {selected && answer ? (
                    <>
                      <p className="text-sm text-muted">{selected.label}</p>
                      <p className="mt-1 font-bold text-heat">{selected.symptom}</p>
                      <h3 className="mt-2 text-2xl">{answer.serviceName ?? 'We will check it for you'}</h3>
                      <p className="tabular mt-3 text-3xl font-extrabold">{answer.priceText}</p>
                      {answer.priceText.includes('₹') && <p className="text-sm text-muted">incl. GST</p>}
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {answer.bookHref && (
                          <Link href={answer.bookHref} className={buttonStyles({ size: 'sm' })}>
                            Book this
                          </Link>
                        )}
                        {answer.detailHref && (
                          <Link href={answer.detailHref} className={buttonStyles({ variant: 'glass', size: 'sm' })}>
                            What&rsquo;s included
                          </Link>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted">AC X-ray</p>
                      <h3 className="mt-1 text-2xl">Tap a glowing dot</h3>
                      <p className="mt-2 text-muted">Each part shows the problem it causes, the service that fixes it and the price before you book.</p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {XRAY_PARTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p)}
                    aria-pressed={selected?.id === p.id}
                    className={cn(
                      'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors',
                      selected?.id === p.id ? 'border border-cool bg-cool text-white dark:text-[#0b0a1f]' : 'glass text-ink',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {groups.map(({ category, label, note, items }) => (
                <div key={category} className="glass rounded-3xl p-6 text-ink">
                  <h3 className="text-xl">{note ? `${label}, ${note.toLowerCase()}` : label}</h3>
                  <ul className="mt-3 divide-y divide-[var(--glass-line)]">
                    {items.map((s) => (
                      <li key={s.code} className="flex items-center justify-between gap-4 py-3">
                        <Link href={`/services/${s.code.toLowerCase()}`} className="font-semibold hover:underline">
                          {s.name}
                        </Link>
                        <span className="tabular shrink-0 font-bold">{servicePriceText(s)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Container>
      </div>
    </section>
  );
}
