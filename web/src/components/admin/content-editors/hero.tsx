'use client';

import { Field, Input } from '@/components/ui/field';
import { LIMITS, type HeroForm } from '@/lib/admin/content';
import type { FieldsProps } from './list';

/** home.hero: the home page's big heading and the line under it. */
export function HeroFields({ value, onChange, errors, disabled }: FieldsProps<HeroForm>) {
  return (
    <div className="grid gap-4">
      <Field label="Headline" hint={`Up to ${LIMITS.headline} characters, e.g. What does your AC need?`} error={errors.headline}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="headline"
            value={value.headline}
            onChange={(e) => onChange({ ...value, headline: e.target.value })}
            maxLength={LIMITS.headline}
            autoComplete="off"
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      <Field label="Line under the headline" hint={`Up to ${LIMITS.subline} characters.`} error={errors.subline}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="subline"
            value={value.subline}
            onChange={(e) => onChange({ ...value, subline: e.target.value })}
            maxLength={LIMITS.subline}
            autoComplete="off"
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
    </div>
  );
}
