'use client';

import type { ReactNode } from 'react';
import { Field, Input, Textarea } from '@/components/ui/field';
import { LIMITS, type IdentityForm } from '@/lib/admin/content';
import type { FieldsProps } from './list';

type TopField = Exclude<keyof IdentityForm, 'grievanceOfficer'>;
type GrievanceField = keyof IdentityForm['grievanceOfficer'];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-[20px] border border-line p-4">
      <legend className="px-1 text-base font-bold text-ink">{title}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * business.identity: the facts in the footer, the contact page, the legal pages and emails. Every
 * field of BusinessIdentity; PYS checks the same shape (businessIdentitySchema).
 */
export function IdentityFields({ value, onChange, errors, disabled }: FieldsProps<IdentityForm>) {
  function text(key: TopField, label: string, opts: { hint?: string; max: number; type?: string; inputMode?: 'numeric' | 'tel' | 'email'; wide?: boolean; tabular?: boolean }) {
    return (
      <div className={opts.wide ? 'sm:col-span-2' : undefined}>
        <Field label={label} hint={opts.hint} error={errors[key]}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name={key}
              type={opts.type}
              inputMode={opts.inputMode}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              maxLength={opts.max}
              autoComplete="off"
              disabled={disabled}
              className={opts.tabular ? 'tabular-nums' : undefined}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
      </div>
    );
  }

  function grievance(key: GrievanceField, label: string, opts: { max: number; type?: string; inputMode?: 'tel' | 'email'; hint?: string; tabular?: boolean }) {
    return (
      <Field label={label} hint={opts.hint} error={errors[`grievanceOfficer.${key}`]}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type={opts.type}
            inputMode={opts.inputMode}
            value={value.grievanceOfficer[key]}
            onChange={(e) => onChange({ ...value, grievanceOfficer: { ...value.grievanceOfficer, [key]: e.target.value } })}
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
  }

  return (
    <div className="flex flex-col gap-4">
      <Group title="The business">
        {text('legalName', 'Legal name', { max: 200, hint: 'As registered, e.g. on the GST certificate.' })}
        {text('tradeName', 'Trade name', { max: 200, hint: 'The name customers know.' })}
        {text('proprietorName', "Owner's name", { max: 120, hint: 'Optional.' })}
        {text('gstin', 'GSTIN', { max: 15, hint: 'Optional. 15 characters.', tabular: true })}
        <div className="sm:col-span-2">
          <Field label="Address" error={errors.address}>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                name="address"
                rows={2}
                value={value.address}
                onChange={(e) => onChange({ ...value, address: e.target.value })}
                maxLength={500}
                disabled={disabled}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
        </div>
      </Group>

      <Group title="How customers reach you">
        {text('phone', 'Phone', { max: 20, type: 'tel', inputMode: 'tel', hint: 'e.g. +91 79778 05245', tabular: true })}
        {text('whatsapp', 'WhatsApp', { max: 20, type: 'tel', inputMode: 'tel', hint: 'Optional. Leave empty to use the phone number.', tabular: true })}
        {text('email', 'Email', { max: 254, type: 'email', inputMode: 'email' })}
        {text('hours', 'Opening hours', { max: 120, hint: 'e.g. Mon–Sat, 9:00 am – 6:30 pm' })}
        {text('warrantyDays', 'Warranty on our work (days)', {
          max: 3,
          inputMode: 'numeric',
          hint: `0 to ${LIMITS.warrantyDays}. 0 hides the warranty line on the home page.`,
          tabular: true,
        })}
      </Group>

      <Group title="Grievance officer">
        <p className="text-sm text-muted sm:col-span-2">Shown in the footer&apos;s complaints box and on the privacy notice and terms. An empty email or phone is saved as the business email and phone.</p>
        {grievance('name', "Grievance officer's name", { max: 120 })}
        {grievance('email', "Grievance officer's email", { max: 254, type: 'email', inputMode: 'email' })}
        {grievance('phone', "Grievance officer's phone", { max: 20, type: 'tel', inputMode: 'tel', tabular: true })}
      </Group>
    </div>
  );
}
