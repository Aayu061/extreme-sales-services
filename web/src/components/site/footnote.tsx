import Link from 'next/link';
import { Container } from '@/components/site/container';
import { FOOTNOTES, footnoteMarks, type FootnoteId } from '@/lib/footnotes';

/** A small star after a claim, linking to the notes at the bottom of the page. */
export function Star({ mark = '*' }: { mark?: string }) {
  return (
    <sup>
      <a href="#notes" aria-label={`See note ${mark}`} className="ml-0.5 font-bold text-cool no-underline">
        {mark}
      </a>
    </sup>
  );
}

/** The page's notes, above the footer: "* On our work… See Terms." */
export function PageNotes({ ids }: { ids: readonly FootnoteId[] }) {
  const marks = footnoteMarks(ids);
  return (
    <Container>
      <aside id="notes" aria-label="Notes" className="scroll-mt-28 border-t border-line py-5 text-sm text-muted">
        <ul className="space-y-1">
          {ids.map((id) => {
            const text = FOOTNOTES[id];
            const terms = text.endsWith(' See Terms.');
            return (
              <li key={id}>
                <span className="font-bold text-ink">{marks[id]}</span> {terms ? text.slice(0, -' See Terms.'.length) : text}
                {terms && (
                  <>
                    {' '}
                    See{' '}
                    <Link href="/legal/terms" className="font-semibold text-cool underline-offset-2 hover:underline">
                      Terms
                    </Link>
                    .
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </aside>
    </Container>
  );
}
