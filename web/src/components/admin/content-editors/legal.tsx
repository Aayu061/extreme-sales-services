'use client';

import { Field, Input, Textarea } from '@/components/ui/field';
import { LIMITS, type LegalForm } from '@/lib/admin/content';
import { LEGAL_PLACEHOLDERS } from '@/lib/legal';
import { AddButton, ItemCard, ItemControls, ListProblem, useItemList, type FieldsProps } from './list';

type Section = LegalForm['sections'][number];

const PLACEHOLDERS = LEGAL_PLACEHOLDERS.map((p) => `{${p}}`).join(', ');

/**
 * legal.privacy / legal.terms: a page title, the "last updated" date, and sections of a heading
 * plus paragraphs. Sections can be added, removed and moved; paragraphs added and removed.
 */
export function LegalFields({ value, onChange, errors, disabled }: FieldsProps<LegalForm>) {
  const setSections = (sections: Section[]) => onChange({ ...value, sections });
  const { root, keys, add, remove, move, focusLater } = useItemList(value.sections, setSections, () => ({ heading: '', paragraphs: [''] }));
  const setSection = (i: number, next: Section) => setSections(value.sections.map((s, j) => (j === i ? next : s)));

  function addParagraph(i: number) {
    const s = value.sections[i];
    const key = keys[i];
    const at = s.paragraphs.length;
    setSection(i, { ...s, paragraphs: [...s.paragraphs, ''] });
    focusLater((r) => r.querySelectorAll<HTMLElement>(`[data-item="${key}"] textarea`)[at] ?? null);
  }

  function removeParagraph(i: number, p: number) {
    const s = value.sections[i];
    const key = keys[i];
    setSection(i, { ...s, paragraphs: s.paragraphs.filter((_, j) => j !== p) });
    focusLater((r) => r.querySelector<HTMLElement>(`[data-item="${key}"] [data-add-paragraph]`));
  }

  return (
    <div ref={root} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label="Page title" error={errors.title}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={value.title}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              maxLength={LIMITS.legalTitle}
              autoComplete="off"
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
        <Field label="Last updated" hint="Shown under the title." error={errors.updatedOn}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              value={value.updatedOn}
              onChange={(e) => onChange({ ...value, updatedOn: e.target.value })}
              disabled={disabled}
              className="tabular-nums"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>
      </div>
      <p className="text-sm text-muted">
        These are filled in from the business details on the website: <span className="wrap-break-word">{PLACEHOLDERS}</span>.
      </p>

      {value.sections.map((section, i) => {
        const n = i + 1;
        const p = `sections.${i}`;
        return (
          <ItemCard key={keys[i]} itemKey={keys[i]} legend={`Section ${n}`}>
            <Field label="Heading" error={errors[`${p}.heading`]}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-label={`Section ${n} heading`}
                  value={section.heading}
                  onChange={(e) => setSection(i, { ...section, heading: e.target.value })}
                  maxLength={LIMITS.heading}
                  autoComplete="off"
                  disabled={disabled}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
            {section.paragraphs.map((text, j) => (
              <div key={j} className="flex flex-col gap-2">
                <Field label={`Paragraph ${j + 1}`} error={errors[`${p}.paragraphs.${j}`]}>
                  {({ id, describedBy, invalid }) => (
                    <Textarea
                      id={id}
                      aria-label={`Section ${n}, paragraph ${j + 1}`}
                      rows={3}
                      value={text}
                      onChange={(e) => setSection(i, { ...section, paragraphs: section.paragraphs.map((t, k) => (k === j ? e.target.value : t)) })}
                      maxLength={LIMITS.paragraph}
                      disabled={disabled}
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                    />
                  )}
                </Field>
                {!disabled && (
                  <ItemControls
                    noun="paragraph"
                    index={j}
                    count={section.paragraphs.length}
                    onRemove={() => removeParagraph(i, j)}
                    removeLabel={`Remove paragraph ${j + 1} of section ${n}`}
                  />
                )}
              </div>
            ))}
            <ListProblem message={errors[`${p}.paragraphs`]} />
            {!disabled && (
              <div className="flex flex-col gap-3 border-t border-line pt-4">
                <AddButton
                  kind="paragraph"
                  ariaLabel={`Add a paragraph to section ${n}`}
                  onClick={() => addParagraph(i)}
                  disabled={section.paragraphs.length >= LIMITS.paragraphs}
                >
                  Add a paragraph
                </AddButton>
                <ItemControls noun="section" index={i} count={value.sections.length} onMove={(by) => move(i, by)} onRemove={() => remove(i)} />
              </div>
            )}
          </ItemCard>
        );
      })}
      <ListProblem message={errors.sections} />
      {!disabled && (
        <AddButton onClick={add} disabled={value.sections.length >= LIMITS.sections}>
          Add a section
        </AddButton>
      )}
    </div>
  );
}
