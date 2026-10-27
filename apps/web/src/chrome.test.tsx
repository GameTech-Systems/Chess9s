import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { App, pageOf, roomCodeOf, rulesIdOf } from './App';
import { ErrorBoundary, ErrorScreen } from './ErrorScreen';
import { installErrorFallback } from './errorFallback';
import { CONTACT_ADDRESS, DISCUSSIONS_URL } from './links';
import { Tournament } from './Tournament';
import { STANDARD_DISCUSSION } from './tournament';
import { PRIVACY_UPDATED } from './Privacy';
import { listRulesets } from './game/rules';

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
    expect(html).not.toMatch(/data-setting="queen.canCrossVoid" data-changed=""/);
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

describe('tournament page (S46)', () => {
  const open = {
    url: 'https://example.test/discussions/1',
    opened: '2026-10-25',
    closes: '2026-11-15',
  };

  it('routes /tournament, with or without a trailing slash', () => {
    expect(pageOf('/tournament')).toBe('tournament');
    expect(pageOf('/tournament/')).toBe('tournament');
  });

  it('says tournaments use Official rulesets only, never custom ones', () => {
    const html = renderToStaticMarkup(<Tournament discussion={null} />);
    expect(html).toMatch(/Official rulesets only/);
    expect(html).toMatch(/never custom/i);
    expect(html).toContain('hot-seat or over the board');
    expect(html).not.toContain('Phase 5');
  });

  it('before the discussion is announced it says it starts when announced', () => {
    const html = renderToStaticMarkup(<Tournament discussion={null} />);
    expect(html).toContain('Standard is a Candidate');
    expect(html).toContain('starts when announced');
    expect(html).not.toContain('example.test');
  });

  it('with the discussion open it links it and gives both dates', () => {
    const html = renderToStaticMarkup(<Tournament discussion={open} />);
    expect(html).toContain('Standard is a Candidate under public discussion');
    expect(html).toContain(`href="${open.url}"`);
    expect(html).toContain('25 October 2026');
    expect(html).toContain('15 November 2026');
    expect(html).not.toContain('starts when announced');
  });

  it('publishes no conduct rules: the organizer announces them with the invitation (D47)', () => {
    const html = renderToStaticMarkup(<Tournament discussion={null} />);
    expect(html).toMatch(/organizer announces/);
    expect(html).toMatch(/with the invitation/);
  });

  it('summarizes how a ruleset becomes Official and links Governance', () => {
    const html = renderToStaticMarkup(<Tournament discussion={null} />);
    expect(html).toMatch(/fairness/i);
    expect(html).toMatch(/21 days/);
    expect(html).toMatch(/ratif/i);
    expect(html).toContain('GOVERNANCE.md');
  });

  it('the real discussion record is the one from the S44 brief', () => {
    expect(STANDARD_DISCUSSION).toEqual({
      url: 'https://github.com/GameTech-Systems/Chess9s/discussions/39',
      opened: '2026-10-25',
      closes: '2026-11-15',
    });
    const html = renderToStaticMarkup(<App path="/tournament" />);
    expect(html).toContain('discussions/39');
  });

  it('is linked from the footer of every page, the rules page and the builder', () => {
    for (const path of ['/', '/privacy', '/rules/standard-2p', '/build', '/tournament']) {
      expect(renderToStaticMarkup(<App path={path} />)).toContain('href="/tournament"');
    }
    expect(renderToStaticMarkup(<App path="/build" />)).toMatch(
      /never a tournament ruleset[\s\S]*href="\/tournament"/,
    );
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

  it('the picker offers Play online for every playable ruleset, and joining by code', () => {
    const html = renderToStaticMarkup(<App path="/" />);
    const playable = listRulesets().filter((r) => r.playable).length;
    expect(html.split('>Play online<')).toHaveLength(playable + 1);
    expect(html).toContain('Join a room');
    expect(html).toContain('aria-label="Room code"');
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

  it('privacy’s date changed with the page', () => {
    expect(PRIVACY_UPDATED).toBe('27 October 2026');
    expect(renderToStaticMarkup(<App path="/privacy" />)).toContain('Last updated 27 October 2026');
  });

  it('the tournament page, the builder note and the tournament invitation say games can be played online by room code, Official ruleset only (D46)', () => {
    const t = renderToStaticMarkup(<Tournament discussion={null} />);
    expect(t).toMatch(/played online by room code/);
    expect(t).toMatch(/Official ruleset only/);
    expect(t).not.toContain('Until online play');
    const b = renderToStaticMarkup(<App path="/build" />);
    expect(b).toMatch(/played online by room code/);
    expect(b).not.toContain('not played online yet');
  });
});
