// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PageBanner } from '@/components/site/page-banner';

afterEach(cleanup);

describe('PageBanner', () => {
  it('shows one title, the intro and breadcrumbs ending at this page', () => {
    const { container } = render(
      <PageBanner title="Services and prices" intro="Every price includes GST." crumbs={[{ href: '/services', label: 'Services' }]} />,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Services and prices');
    expect(screen.getByText('Every price includes GST.')).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = nav.querySelectorAll('a');
    expect(links[0].getAttribute('href')).toBe('/');
    const last = nav.querySelectorAll('li');
    expect(last[last.length - 1].querySelector('[aria-current="page"]')?.textContent).toBe('Services');
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    imgs.forEach((img) => expect(img.getAttribute('alt')).toBe(''));
  });
});
