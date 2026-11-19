import { Container } from '@/components/site/container';
import { PageBanner } from '@/components/site/page-banner';
import { FALLBACK_HERO, FALLBACK_IDENTITY, getContentBlocks, getSiteBasics } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { legalBody, type LegalDoc } from '@/lib/legal';

/** Privacy notice / terms: published admin text if complete, else the built-in wording. */
export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const key = `legal.${doc}`;
  const [{ identity }, blocks] = await Promise.all([
    getSiteBasics().catch(() => ({ identity: FALLBACK_IDENTITY, hero: FALLBACK_HERO })),
    getContentBlocks([key]).catch(() => ({}) as Record<string, { body: unknown }>),
  ]);
  const body = legalBody(doc, blocks[key]?.body, identity);
  return (
    <>
      <PageBanner title={body.title} intro={`Last updated ${formatDate(body.updatedOn) ?? body.updatedOn}`} crumbs={[{ href: `/legal/${doc}`, label: body.title }]} />
      <Container className="py-8 sm:py-12">
        <article className="glass max-w-[75ch] rounded-[30px] p-6 text-ink sm:p-10">
          {body.sections.map((s) => (
            <section key={s.heading} className="mb-7 last:mb-0">
              <h2 className="text-2xl">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-3 text-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </Container>
    </>
  );
}
