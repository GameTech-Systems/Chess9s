import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { App, pageOf, rulesIdOf } from './App';
import { ErrorBoundary, ErrorScreen } from './ErrorScreen';
import { installErrorFallback } from './errorFallback';
import { CONTACT_ADDRESS, DISCUSSIONS_URL } from './links';

describe('error screen', () => {
  it('replaces the app with a message and a way to report it', () => {
    const html = renderToStaticMarkup(<ErrorScreen />);
    expect(html).toContain('Something went wrong');
    expect(html).toContain(`href="${DISCUSSIONS_URL}"`);
  });

  it('the boundary moves to the failed state when a child throws', () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    expect(renderToStaticMarkup(<ErrorBoundary>fine</ErrorBoundary>)).toBe('fine');
  });

  it('the window fallback speaks only while the page is empty', () => {
    const handlers: Record<string, () => void> = {};
    const target = { addEventListener: (t: string, l: () => void) => (handlers[t] = l) };
    const show = vi.fn();
    let empty = true;
    installErrorFallback(target, () => empty, show);
    handlers.error!();
    expect(show).toHaveBeenCalledTimes(1);
    empty = false;
    handlers.unhandledrejection!();
    expect(show).toHaveBeenCalledTimes(1);
  });
});

describe('pages', () => {
  it('routes /privacy, with or without a trailing slash; anything else is the game', () => {
    expect(pageOf('/privacy')).toBe('privacy');
    expect(pageOf('/privacy/')).toBe('privacy');
    expect(pageOf('/')).toBe('game');
    expect(pageOf('/no/such/page')).toBe('game');
  });

  it("routes /rules/<ruleset id> to that ruleset's rules page", () => {
    expect(pageOf('/rules/standard-2p')).toBe('rules');
    expect(pageOf('/rules/standard-2p/')).toBe('rules');
    expect(rulesIdOf('/rules/standard-2p')).toBe('standard-2p');
    expect(rulesIdOf('/rules/')).toBeUndefined();
  });

  it('the rules page lists every setting of the ruleset, marking what it changes', () => {
    const html = renderToStaticMarkup(<App path="/rules/standard-2p" />);
    expect(html).toContain('Standard');
    expect(html).toContain('King range');
    expect(html).toMatch(/data-setting="king.range" data-changed=""/);
    expect(html).not.toMatch(/data-setting="queen.canEnterVoid" data-changed=""/);
    expect(html).toContain('Pawn colors and safe zones');
    expect(html).toContain('>Play Standard<');
  });

  it('the rules page shows option labels, not raw values, under the registry groups', () => {
    const html = renderToStaticMarkup(<App path="/rules/standard-2p" />);
    expect(html).toContain('>1 square<');
    expect(html).toContain('default 2 squares');
    expect(html).toContain('A5, E5 and I5');
    expect(html).not.toContain('<code>a5-e5-i5</code>');
    for (const g of ['King', 'Queen', 'Pawns', 'Center', 'Coast', 'Dragon Tail', 'Setup']) {
      expect(html).toContain(`<h4>${g}</h4>`);
    }
  });

  it('the rules page for an unknown ruleset says so and lists the real ones', () => {
    const html = renderToStaticMarkup(<App path="/rules/nope" />);
    expect(html).toContain('No ruleset called');
    expect(html).toContain('href="/rules/standard-2p"');
  });

  it('privacy page states the facts and the storage key', () => {
    const html = renderToStaticMarkup(<App path="/privacy" />);
    for (const fact of [
      'no accounts',
      'no analytics',
      'no cookies',
      'no network requests',
      'chess9s.guest',
      'Cloudflare',
      'children',
      'Do Not Track',
      'Last updated',
    ]) {
      expect(html).toContain(fact);
    }
  });

  it('privacy page gives a working way to ask, never a placeholder', () => {
    const html = renderToStaticMarkup(<App path="/privacy" />);
    expect(html).not.toContain('PROJECT_CONTACT_ADDRESS');
    if (CONTACT_ADDRESS) expect(html).toContain(`href="mailto:${CONTACT_ADDRESS}"`);
    else expect(html).toMatch(new RegExp(`Questions:[\\s\\S]*?href="${DISCUSSIONS_URL}"`));
  });

  it('every page carries the copyright and trademark notice and links to the licenses', () => {
    for (const path of ['/', '/privacy', '/rules/standard-2p']) {
      const html = renderToStaticMarkup(<App path={path} />);
      expect(html).toContain('Chess Nines™');
      expect(html).toMatch(/© 2026 Duke Johnson/);
      expect(html).toContain('href="/third-party-licenses.txt"');
    }
  });

  it('every page links to Suggest a variant', () => {
    for (const path of ['/', '/privacy', '/rules/standard-2p']) {
      expect(renderToStaticMarkup(<App path={path} />)).toContain(
        `href="${DISCUSSIONS_URL}">Suggest a variant`,
      );
    }
  });
});
