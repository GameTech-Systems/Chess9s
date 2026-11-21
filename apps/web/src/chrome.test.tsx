import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { App, canonicalOf, pageOf, roomCodeOf, rulesIdOf, titleOf, SITE_TITLE } from './App';
import { detailLine, wrapLines } from './game/boardImage';
import { ErrorBoundary, ErrorScreen } from './ErrorScreen';
import { ERROR_TITLE, installErrorFallback, showPlainError } from './errorFallback';
import { CONTACT_ADDRESS, DISCUSSIONS_URL } from './links';
import { PRIVACY_UPDATED } from './Privacy';
import { HOME_PRESETS, listRulesets } from './game/rules';
import { RulePicker } from './RulePicker';
import { preloadPages } from './pages';

// The app's on-demand pages (row 4, S95) render at once once loaded.
beforeAll(preloadPages);

const file = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

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

  it('the plain error message names the tab too (row 8, S95)', () => {
    const made: { tag: string; text?: string; href?: string; parts: unknown[] }[] = [];
    const doc = {
      title: SITE_TITLE,
      createElement(tag: string) {
        const el = {
          tag,
          parts: [] as unknown[],
          set textContent(t: string) {
            (this as { text?: string }).text = t;
          },
          append(...p: unknown[]) {
            this.parts.push(...p);
          },
        };
        made.push(el);
        return el;
      },
    };
    const root = { ownerDocument: doc, replaceChildren: vi.fn() };
    showPlainError(root as unknown as HTMLElement);
    expect(doc.title).toBe(ERROR_TITLE);
    expect(ERROR_TITLE).toBe('Something went wrong · Chess Nines');
    expect(root.replaceChildren).toHaveBeenCalledTimes(1);
    expect(made.map((e) => e.tag)).toEqual(['h1', 'p', 'a']);
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

  it('the rules page lists every setting; Standard is the default, so others mark what differs', () => {
    const html = renderToStaticMarkup(<App path="/rules/standard-2p" />);
    expect(html).toContain('Standard');
    expect(html).toContain('King range');
    expect(html).not.toMatch(/data-changed=""/);
    expect(html).not.toMatch(/differs from Standard|changed · default|\(default /);
    const practice = renderToStaticMarkup(<App path="/rules/draft-2p" />);
    expect(practice).toMatch(/data-setting="king.range" data-changed=""/);
    expect(practice).not.toMatch(/data-setting="queen.canCrossVoid" data-changed=""/);
    expect(practice).toContain('How it differs from Standard');
    // The 3-player Standard is the baseline of the 3-player rulesets.
    expect(renderToStaticMarkup(<App path="/rules/heavy-h3-3p" />)).not.toMatch(/data-changed=""/);
    expect(html).toContain('Pawn colors and safe zones');
    expect(html).toContain('>Play Standard<');
  });

  it('the rules page shows option labels, not raw values, under the registry groups', () => {
    const html = renderToStaticMarkup(<App path="/rules/standard-2p" />);
    expect(html).toContain('>1 square<');
    expect(renderToStaticMarkup(<App path="/rules/draft-2p" />)).toContain('Standard: 1 square');
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
    // Only the rulesets a player can pick on the home page, and no project wording.
    expect(html).toContain('href="/rules/heavy-h3-3p"');
    expect(html).not.toContain('href="/rules/heavy-3p"');
    expect(html).not.toMatch(/in this build|<code>/);
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
    for (const path of ['/', '/privacy', '/how-to-play', '/rules/standard-2p']) {
      const html = renderToStaticMarkup(<App path={path} />);
      expect(html).toContain('Chess Nines™');
      // The rights holder's name appears once in the line, not twice.
      expect(html).toContain('© 2026 Chess Nines™ is a trademark of Duke Johnson.');
      expect(html.match(/Duke Johnson/g)).toHaveLength(1);
      expect(html).toContain('href="/third-party-licenses.txt"');
    }
  });

  it('every page links to Suggest a variant', () => {
    for (const path of ['/', '/privacy', '/how-to-play', '/rules/standard-2p']) {
      expect(renderToStaticMarkup(<App path={path} />)).toContain(
        `href="${DISCUSSIONS_URL}">Suggest a variant`,
      );
    }
  });
});

describe('How to play page', () => {
  it('routes /how-to-play, with or without a trailing slash, and the footer link goes there', () => {
    expect(pageOf('/how-to-play')).toBe('how');
    expect(pageOf('/how-to-play/')).toBe('how');
    const html = renderToStaticMarkup(<App path="/" />);
    expect(html).toContain('href="/how-to-play">How to play');
    expect(html).not.toMatch(/href="\/rules\/standard-2p">How to play/);
  });

  it('walks a newcomer through the game without naming a ruleset until the presets', () => {
    const html = renderToStaticMarkup(<App path="/how-to-play" />);
    for (const part of ['The board', 'The pieces', 'The Coast', 'Pawns', 'Playing with three']) {
      expect(html).toContain(`<h3>${part}</h3>`);
    }
    const [walkthrough = '', presets = ''] = html.split('<h3>Rules you can switch</h3>');
    expect(presets).not.toBe('');
    expect(walkthrough).not.toMatch(/Standard|Easy Start|Good Practice|default|Balance-tested/);
    // The old first section of this page is gone.
    expect(html).not.toContain('the default ruleset');
    expect(html).not.toContain('Bot self-play found the two sides evenly matched.</p>');
  });

  it('offers the three presets of each player count, and the builder, by their names', () => {
    const html = renderToStaticMarkup(<App path="/how-to-play" />);
    for (const id of [...HOME_PRESETS[2], ...HOME_PRESETS[3]]) {
      expect(html).toContain(`href="/rules/${id}"`);
    }
    expect(html).toContain('>Choose a game<');
    expect(html).toContain('>Build a custom ruleset<');
    // Ids live in the link addresses only; the words players read carry none.
    expect(html.replace(/href="[^"]*"/g, '')).not.toMatch(/heavy-h3-3p|draft-3p| v\d+\.\d+/);
  });

  it('has no doubled full stop anywhere on the rules pages', () => {
    for (const path of ['/how-to-play', '/rules/standard-2p', '/rules/heavy-h3-3p']) {
      expect(renderToStaticMarkup(<App path={path} />)).not.toMatch(/[a-z]\.\.(?!\.)/);
    }
  });
});

describe('launch files', () => {
  const file = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

  it('the sitemap lists the pages and every preset rules page, and nothing private', () => {
    const sitemap = file('../public/sitemap.xml');
    for (const path of ['/', '/how-to-play', '/privacy']) {
      expect(sitemap).toContain(`<loc>https://chess9s.com${path}</loc>`);
    }
    for (const id of [...HOME_PRESETS[2], ...HOME_PRESETS[3]]) {
      expect(sitemap).toContain(`<loc>https://chess9s.com/rules/${id}</loc>`);
    }
    expect(sitemap).not.toMatch(/\/room\/|\/api\//);
    expect(file('../public/robots.txt')).toMatch(/Sitemap: https:\/\/chess9s\.com\/sitemap\.xml/);
  });

  it('the home page carries a share image of the right size', () => {
    const html = file('../index.html');
    expect(html).toContain('content="https://chess9s.com/share.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    const png = readFileSync(new URL('../public/share.png', import.meta.url));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  it('each page names itself in the browser tab', () => {
    expect(titleOf('game')).toBe(SITE_TITLE);
    expect(titleOf('how')).toBe('How to play · Chess Nines');
    expect(titleOf('rules', 'Easy Start')).toBe('Easy Start rules · Chess Nines');
    expect(titleOf('privacy')).toBe('Privacy · Chess Nines');
  });
});

describe('board image', () => {
  it('wraps a result line to the room it has', () => {
    const width = (l: string) => l.length * 10;
    expect(wrapLines('Checkmate · Dark wins', width, 120)).toEqual(['Checkmate ·', 'Dark wins']);
    expect(wrapLines('Draw', width, 120)).toEqual(['Draw']);
    expect(wrapLines('', width, 120)).toEqual([]);
    expect(detailLine('Standard', 1)).toBe('Standard · 1 move');
    expect(detailLine('Standard', 24)).toBe('Standard · 24 moves');
  });
});

describe('no Tournaments page (D86)', () => {
  it('sends /tournament to the home page, with or without a trailing slash', () => {
    expect(pageOf('/tournament')).toBe('game');
    expect(pageOf('/tournament/')).toBe('game');
    expect(renderToStaticMarkup(<App path="/tournament" />)).toBe(
      renderToStaticMarkup(<App path="/" />),
    );
  });

  it('has no tournament link or wording on any page', () => {
    for (const path of [
      '/',
      '/privacy',
      '/how-to-play',
      '/rules/standard-2p',
      '/build',
      '/tournament',
    ]) {
      const html = renderToStaticMarkup(<App path={path} />);
      expect(html).not.toContain('href="/tournament"');
      expect(html).not.toMatch(/tournament/i);
    }
  });

  it('the privacy page says a saved game record is a file on your device, nothing sent', () => {
    const html = renderToStaticMarkup(<App path="/privacy" />);
    expect(html).toMatch(/game record/i);
    expect(html).toMatch(/Nothing is sent or stored/);
  });
});

describe('online play pages (S53)', () => {
  it('routes /room/<code> to the room page, in any case, with or without a trailing slash', () => {
    expect(pageOf('/room/K7RX2M')).toBe('room');
    expect(pageOf('/room/k7rx2m/')).toBe('room');
    expect(roomCodeOf('/room/k7rx2m/')).toBe('K7RX2M');
    expect(roomCodeOf('/room/')).toBeUndefined();
    expect(roomCodeOf('/privacy')).toBeUndefined();
    expect(pageOf('/room/')).toBe('game');
  });

  it('the room page starts by looking for the room, under the Online heading', () => {
    const html = renderToStaticMarkup(<App path="/room/K7RX2M" />);
    expect(html).toContain('Looking for the room');
    expect(html).toContain('<p>Online</p>');
    expect(html).toContain('Back to the game');
  });

  it('the home page offers Play online for every ruleset of the chosen count, and joining by code', () => {
    const html = renderToStaticMarkup(<App path="/" />);
    const two = listRulesets().filter((r) => r.online && r.players === 2).length;
    expect(html.split('>Play online<')).toHaveLength(two + 1);
    expect(html).toContain('Join a room');
    expect(html).toContain('aria-label="Room code"');
    const three = renderToStaticMarkup(
      <RulePicker players={3} onPick={() => {}} onPlayOnline={() => {}} />,
    );
    // Only the three presets are shown; the study rulesets are hidden (D84).
    const online3 = HOME_PRESETS[3].length;
    expect(three.split('>Play online<')).toHaveLength(online3 + 1);
  });

  it('links the favicon, the home-screen icon and the share card in index.html', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain('rel="icon" type="image/svg+xml" href="../../assets/brand/favicon.svg"');
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
    expect(html).toContain('rel="icon" href="/favicon.ico"');
    expect(html).toContain('rel="manifest" href="/site.webmanifest"');
    expect(html).toContain('property="og:title" content="Chess Nines"');
    expect(html).not.toContain('href="data:,"');
  });

  it('index.html has a canonical link, Open Graph and Twitter tags, and real text without JavaScript', () => {
    const html = file('../index.html');
    expect(html).toContain('rel="canonical" href="https://chess9s.com/"');
    for (const tag of ['og:site_name', 'og:image', 'og:description', 'og:url']) {
      expect(html, tag).toContain(`property="${tag}"`);
    }
    for (const tag of ['title', 'description', 'image', 'image:alt']) {
      expect(html, tag).toContain(`name="twitter:${tag}"`);
    }
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? '';
    expect(noscript).toContain('<h1>Chess Nines</h1>');
    expect(noscript).toContain('9×9 chess variant');
    expect(noscript).toContain('JavaScript');
  });

  it('ships the icons, the manifest and security.txt at fixed addresses', () => {
    const size = (name: string) => {
      const png = readFileSync(new URL(`../public/${name}`, import.meta.url));
      return [png.readUInt32BE(16), png.readUInt32BE(20)];
    };
    expect(size('apple-touch-icon.png')).toEqual([180, 180]);
    expect(size('icon-192.png')).toEqual([192, 192]);
    expect(size('icon-512.png')).toEqual([512, 512]);
    const ico = readFileSync(new URL('../public/favicon.ico', import.meta.url));
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]); // an icon file
    expect(ico.readUInt16LE(4)).toBeGreaterThan(0); // with at least one image

    const manifest = JSON.parse(file('../public/site.webmanifest'));
    expect(manifest).toMatchObject({
      name: 'Chess Nines',
      start_url: '/',
      display: 'standalone',
    });
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
    for (const icon of manifest.icons) {
      expect(readFileSync(new URL(`../public${icon.src}`, import.meta.url)).length).toBeGreaterThan(
        0,
      );
    }

    const security = file('../public/.well-known/security.txt');
    expect(security).toContain(
      'Contact: https://github.com/GameTech-Systems/Chess9s/security/advisories/new',
    );
    expect(security).toMatch(/^Expires: 2027-11-01T00:00:00\.000Z$/m);
    expect(security).not.toMatch(/mailto:|@/);

    const headers = file('../public/_headers');
    for (const path of [
      '/favicon.ico',
      '/apple-touch-icon.png',
      '/icon-192.png',
      '/icon-512.png',
      '/site.webmanifest',
      '/.well-known/security.txt',
      '/share.png',
    ]) {
      expect(headers, path).toMatch(
        new RegExp(`^${path.replace(/[.]/g, '\\.')}\\n\\s+Cache-Control:`, 'm'),
      );
    }
    expect(headers).toContain("manifest-src 'self'");
  });

  it('names the canonical address of each page', () => {
    expect(canonicalOf('/')).toBe('https://chess9s.com/');
    expect(canonicalOf('/how-to-play/')).toBe('https://chess9s.com/how-to-play');
    expect(canonicalOf('/privacy')).toBe('https://chess9s.com/privacy');
    expect(canonicalOf('/rules/standard-2p')).toBe('https://chess9s.com/rules/standard-2p');
    expect(canonicalOf('/room/K7RX2M')).toBe('https://chess9s.com/');
    expect(canonicalOf('/nothing-here')).toBe('https://chess9s.com/');
  });

  it('a skip link to the board comes first on the game and room pages (row 6, S95)', () => {
    for (const path of ['/', '/room/K7RX2M']) {
      const html = renderToStaticMarkup(<App path={path} />);
      const link = html.indexOf('<a class="skip-link" href="#board">Skip to the board</a>');
      expect(link, path).toBeGreaterThan(-1);
      expect(html.slice(0, link), path).not.toMatch(/<(a|button|input|select|textarea)\b/);
    }
    // The home page's mode cards draw boards, but none of them is the board to play on.
    expect(renderToStaticMarkup(<App path="/" />)).not.toContain('id="board"');
    for (const path of ['/privacy', '/how-to-play', '/rules/standard-2p'])
      expect(renderToStaticMarkup(<App path={path} />), path).not.toContain('skip-link');
    // Where no board is drawn, the link is hidden (and so out of the tab order).
    expect(file('./styles.css')).toMatch(
      /\.page:not\(:has\(#board\)\) \.skip-link \{\s*display: none;/,
    );
  });

  it('privacy says what online play sends, what the server keeps and for how long (D53)', () => {
    const html = renderToStaticMarkup(<App path="/privacy" />);
    for (const fact of [
      'room code',
      'the ruleset',
      'your moves',
      'seat token',
      '24 hours after the game ends',
      '7 days with no move',
      'IP address',
      'its own terms',
      'no names or accounts',
      'chess9s.online',
    ]) {
      expect(html, fact).toContain(fact);
    }
    // Online play is the one time the app talks to the server, and only when chosen.
    expect(html).toMatch(/no network requests until you/);
    expect(html).not.toContain('never sent anywhere');
  });

  it('privacy says the server counts requests by IP address for a minute, and keeps no address (K1, S95)', () => {
    const html = renderToStaticMarkup(<App path="/privacy" />);
    expect(html).toContain('counted by IP address for one minute');
    expect(html).toContain('never stores or logs the address');
    expect(html).not.toContain('we do not receive or use it');
  });

  it('privacy says the server keeps each seat’s time left with the moves (S66, D53)', () => {
    const html = renderToStaticMarkup(<App path="/privacy" />);
    expect(html).toContain('time left after each move');
    expect(html).toContain('the time control the room is made with');
  });

  it('privacy’s date changed with the page', () => {
    expect(PRIVACY_UPDATED).toBe('21 November 2026');
    expect(renderToStaticMarkup(<App path="/privacy" />)).toContain(
      'Last updated 21 November 2026',
    );
  });
});
