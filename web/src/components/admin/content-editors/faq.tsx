'use client';

import { Field, Input, Textarea } from '@/components/ui/field';
import { LIMITS, type FaqForm } from '@/lib/admin/content';
import { AddButton, ItemCard, ItemControls, ListProblem, useItemList, type FieldsProps } from './list';

type Item = FaqForm['items'][number];

/** faq: questions and their answers, in the order shown. */
export function FaqFields({ value, onChange, errors, disabled }: FieldsProps<FaqForm>) {
  const setItems = (items: Item[]) => onChange({ ...value, items });
  const { root, keys, add, remove, move } = useItemList(value.items, setItems, () => ({ question: '', answer: '' }));
  const set = (i: number, key: keyof Item, v: string) => setItems(value.items.map((q, j) => (j === i ? { ...q, [key]: v } : q)));

  return (
    <div ref={root} className="flex flex-col gap-4">
      {value.items.length === 0 && <p className="font-semibold text-ink">No questions yet.</p>}
      {value.items.map((item, i) => (
        <ItemCard key={keys[i]} itemKey={keys[i]} legend={`Question ${i + 1}`}>
          <Field label="Question" error={errors[`items.${i}.question`]}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                value={item.question}
                onChange={(e) => set(i, 'question', e.target.value)}
                maxLength={LIMITS.question}
                autoComplete="off"
                disabled={disabled}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
          <Field label="Answer" error={errors[`items.${i}.answer`]}>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                value={item.answer}
                onChange={(e) => set(i, 'answer', e.target.value)}
                maxLength={LIMITS.answer}
                disabled={disabled}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
          {!disabled && <ItemControls noun="question" index={i} count={value.items.length} onMove={(by) => move(i, by)} onRemove={() => remove(i)} />}
        </ItemCard>
      ))}
      <ListProblem message={errors.items} />
      {!disabled && (
        <AddButton onClick={add} disabled={value.items.length >= LIMITS.faqItems}>
          Add a question
        </AddButton>
      )}
    </div>
  );
}
