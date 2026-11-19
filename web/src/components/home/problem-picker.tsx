'use client';

import { useState } from 'react';
import { Chip } from '@/components/ui/chip';
import { ButtonLink } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import type { ProblemChip } from '@/lib/problems';
import type { CatalogService } from '@/lib/pys/types';

export type PickerService = Pick<CatalogService, 'code' | 'name' | 'shortDescription' | 'pricingModel' | 'price'>;

/** Symptom chips; choosing one opens the matching service inline with its real price. */
export function ProblemPicker({ chips, services }: { chips: ProblemChip[]; services: PickerService[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = chips.find((c) => c.id === selectedId) ?? null;
  const service = selected && 'serviceCode' in selected ? services.find((s) => s.code === selected.serviceCode) : null;

  return (
    <div>
      <div role="group" aria-label="What does your AC need?" className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Chip
            key={chip.id}
            tone={chip.tone}
            selected={chip.id === selectedId}
            aria-controls="problem-answer"
            onClick={() => setSelectedId(chip.id === selectedId ? null : chip.id)}
          >
            {chip.label}
          </Chip>
        ))}
      </div>

      <div id="problem-answer" aria-live="polite" className="mt-5 min-h-30">
        {!selected && (
          <p className="rounded-card border border-dashed border-line px-5 py-4 text-slate">
            Choose what is wrong to see the price and book a visit. Not sure? Pick &ldquo;Not cooling&rdquo; and our technician will find the cause.
          </p>
        )}
        {selected && (
          <div key={selected.id} className="pop-in rounded-card border border-sky/60 bg-cyan-wash/40 p-5">
            {'href' in selected ? (
              <>
                <p className="text-lg font-semibold text-navy">{selected.label}</p>
                <p className="mt-1 text-slate">{selected.note}</p>
                <ButtonLink href={selected.href} className="mt-4">
                  {selected.href === '/amc' ? 'Compare AMC plans' : 'See ACs for sale'}
                </ButtonLink>
              </>
            ) : service ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-prose">
                    <p className="text-lg font-semibold text-navy">
                      {selected.label}: {service.name.toLowerCase()}
                    </p>
                    <p className="mt-1 text-slate">{selected.note}</p>
                  </div>
                  <Price
                    price={service.pricingModel === 'QUOTE_AFTER_DIAGNOSIS' ? null : service.price}
                    prefix={service.pricingModel === 'FROM' ? 'From' : undefined}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ButtonLink href={`/book?service=${encodeURIComponent(service.code)}`}>Book this visit</ButtonLink>
                  <ButtonLink href={`/services/${service.code.toLowerCase()}`} variant="secondary">
                    What is included
                  </ButtonLink>
                </div>
              </>
            ) : (
              <p className="text-slate">This service is not available online right now. Please call us.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
