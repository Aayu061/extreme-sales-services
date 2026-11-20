'use client';

import { Field, Input, Textarea } from '@/components/ui/field';
import { LIMITS, emptyOffer, type OfferForm, type OffersForm } from '@/lib/admin/content';
import { AddButton, ItemCard, ItemControls, ListProblem, useItemList, type FieldsProps } from './list';

/** home.offers: the offer cards; the home page shows the first one still running. */
export function OffersFields({ value, onChange, errors, disabled }: FieldsProps<OffersForm>) {
  const setItems = (items: OfferForm[]) => onChange({ ...value, items });
  const { root, keys, add, remove, move } = useItemList(value.items, setItems, emptyOffer);
  const set = (i: number, key: keyof OfferForm, v: string) => setItems(value.items.map((o, j) => (j === i ? { ...o, [key]: v } : o)));

  return (
    <div ref={root} className="flex flex-col gap-4">
      <p className="text-muted">The home page shows the first offer that is still running. With none, it shows the month&apos;s season tip.</p>
      {value.items.length === 0 && <p className="font-semibold text-ink">No offers yet.</p>}
      {value.items.map((offer, i) => {
        const p = `items.${i}`;
        const text = (key: keyof OfferForm, label: string, opts: { hint?: string; max: number; type?: string; tabular?: boolean }) => (
          <Field label={label} hint={opts.hint} error={errors[`${p}.${key}`]}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type={opts.type}
                value={offer[key]}
                onChange={(e) => set(i, key, e.target.value)}
                maxLength={opts.max}
                autoComplete="off"
                disabled={disabled}
                className={opts.tabular ? 'tabular-nums' : undefined}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
        );
        return (
          <ItemCard key={keys[i]} itemKey={keys[i]} legend={`Offer ${i + 1}`}>
            {text('title', 'Title', { max: LIMITS.offerTitle, hint: 'e.g. Jet wash week' })}
            <Field label="Text" hint="Optional. One or two short lines." error={errors[`${p}.text`]}>
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  rows={2}
                  value={offer.text}
                  onChange={(e) => set(i, 'text', e.target.value)}
                  maxLength={LIMITS.offerText}
                  disabled={disabled}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {text('href', 'Link to a page of this site', { max: LIMITS.offerHref, hint: 'Optional, e.g. /amc or /services/svc-jet-wash.' })}
              {text('linkLabel', 'Link text', { max: LIMITS.offerLinkLabel, hint: 'Optional, e.g. Compare AMC plans.' })}
            </div>
            {text('endsOn', 'Last day', { type: 'date', max: 10, tabular: true, hint: 'Optional. The offer hides itself after this day (India time).' })}
            {!disabled && <ItemControls noun="offer" index={i} count={value.items.length} onMove={(by) => move(i, by)} onRemove={() => remove(i)} />}
          </ItemCard>
        );
      })}
      <ListProblem message={errors.items} />
      {!disabled && (
        <AddButton onClick={add} disabled={value.items.length >= LIMITS.offers}>
          Add an offer
        </AddButton>
      )}
    </div>
  );
}
