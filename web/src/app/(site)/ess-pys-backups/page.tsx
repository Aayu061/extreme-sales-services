import type { Metadata } from 'next';
import Link from 'next/link';
import { PageBanner } from '@/components/site/page-banner';
import { Container } from '@/components/site/container';

export const metadata: Metadata = {
  title: 'ESS-PYS Backups',
  description: 'ESS-PYS Backups is the internal tool that keeps encrypted backup copies of our records in our own Google Drive.',
  alternates: { canonical: '/ess-pys-backups' },
};

const link = 'font-semibold text-cool underline-offset-4 hover:underline';

/** Home page of the "ESS-PYS Backups" Google OAuth app (Google Auth Platform → Branding → App home page). */
export default function EssPysBackupsPage() {
  return (
    <>
      <PageBanner
        title="ESS-PYS Backups"
        intro="Our internal tool that keeps encrypted backup copies of our records in our own Google Drive."
        crumbs={[{ href: '/ess-pys-backups', label: 'ESS-PYS Backups' }]}
      />
      <Container className="max-w-[880px] py-8 sm:py-12">
        <div className="glass flex flex-col gap-6 rounded-3xl p-6 text-ink sm:p-8">
          <section aria-labelledby="what">
            <h2 id="what" className="text-2xl">What it is</h2>
            <p className="mt-2">
              ESS-PYS Backups is used only by Extreme Sales &amp; Services. It is not offered to the public and has no
              users of its own. Once a night it copies the database behind this website and our service system (Place
              Your Service), encrypts the copy and stores it in a private folder in our business Google Drive, so that our
              records can be restored after a technical failure.
            </p>
            <p className="mt-2 text-muted">
              Status: ready and tested; it runs only with test data until we switch it on for our live records.
            </p>
          </section>

          <section aria-labelledby="google">
            <h2 id="google" className="text-2xl">What it asks Google for</h2>
            <ul className="mt-2 list-disc pl-5">
              <li>
                One permission: <strong>drive.file</strong> (&quot;See, edit, create and delete only the specific Google
                Drive files you use with this app&quot;). The tool can only see and manage the files and folders it creates
                itself. It cannot read anything else in the Drive.
              </li>
              <li>It creates the private folder ESS-PYS-Backups, sub-folders per month, and its backup files. It never shares them.</li>
              <li>
                Its sign-in token is stored only as a protected secret of our automated systems, never in code, logs or the
                backup files. Access can be withdrawn at any time in the Google account&apos;s security settings
                (Third-party apps &amp; services).
              </li>
            </ul>
          </section>

          <section aria-labelledby="how">
            <h2 id="how" className="text-2xl">How the copies are protected</h2>
            <ul className="mt-2 list-disc pl-5">
              <li>Each copy is encrypted before it leaves our systems, with a key that only we hold and keep offline. Google receives only encrypted files.</li>
              <li>A SHA-256 checksum is recorded for every file; after uploading, the tool downloads the file again and checks it.</li>
              <li>Copies are kept for 30 days and then deleted automatically. The newest good copy is always kept, and files the tool did not create are never touched.</li>
              <li>A copy is used only to restore our records: we download it, check its checksum, decrypt it on our own computer and restore it into our database.</li>
            </ul>
          </section>

          <section aria-labelledby="policies">
            <h2 id="policies" className="text-2xl">Policies and contact</h2>
            <p className="mt-2">
              How we handle personal data, including these backup copies, is described in our{' '}
              <Link href="/legal/privacy" className={link}>
                privacy notice
              </Link>
              . Our{' '}
              <Link href="/legal/terms" className={link}>
                terms
              </Link>{' '}
              apply to this website. Questions: <a href="mailto:extremess0121@gmail.com" className={link}>extremess0121@gmail.com</a>.
            </p>
          </section>
        </div>
      </Container>
    </>
  );
}
