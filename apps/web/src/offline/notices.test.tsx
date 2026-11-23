// Decision 0025: what says it needs a connection instead of failing, and when an update is offered.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CreateRoom } from '../CreateRoom';
import { JoinByCode } from '../JoinByCode';
import { OnlineRoom } from '../OnlineRoom';
import { Privacy, PRIVACY_UPDATED } from '../Privacy';
import { CONTACT_ADDRESS } from '../links';
import { findRuleset } from '../game/rules';
import { RoomController } from '../game/roomController';
import { CODE, FakeSocket, memory } from '../game/roomFakes';
import { gameInProgress, newModel } from '../game/session';
import { ONLINE_ONLY_TEXT } from './online';
import { UpdateNotice } from './UpdateNotice';
import { AppUpdates } from './updates';
import { createRulesFor } from '../game/rules';

const standard = findRuleset('standard-2p')!;

describe('online-only notices', () => {
  it('Play online (the create screen) says it needs a connection and cannot be pressed', () => {
    const html = (online: boolean) =>
      renderToStaticMarkup(
        <CreateRoom
          ruleset={standard}
          store={memory()}
          onCancel={() => {}}
          onCreated={() => {}}
          online={online}
        />,
      );
    expect(html(false)).toContain(ONLINE_ONLY_TEXT);
    expect(html(false)).toMatch(/<button[^>]*disabled=""[^>]*>Create room</);
    expect(html(true)).not.toContain(ONLINE_ONLY_TEXT);
    expect(html(true)).not.toMatch(/<button[^>]*disabled=""[^>]*>Create room</);
  });

  it('Join a room says it needs a connection and cannot be pressed', () => {
    const html = (online: boolean) =>
      renderToStaticMarkup(<JoinByCode onJoin={() => {}} online={online} />);
    expect(html(false)).toContain(ONLINE_ONLY_TEXT);
    expect(html(false)).toMatch(/<button[^>]*disabled=""[^>]*>Join</);
    expect(html(true)).not.toContain(ONLINE_ONLY_TEXT);
  });

  it('a room page says it needs a connection while the browser is offline', async () => {
    const controller = new RoomController({
      code: CODE,
      store: memory(),
      fetch: async () => {
        throw new TypeError('offline');
      },
      open: () => new FakeSocket(),
    });
    await controller.start();
    const html = (online: boolean) =>
      renderToStaticMarkup(<OnlineRoom code={CODE} controller={controller} online={online} />);
    expect(html(false)).toContain(ONLINE_ONLY_TEXT);
    expect(html(true)).not.toContain(ONLINE_ONLY_TEXT);
  });
});

describe('the update notice (D90)', () => {
  const ready = () => {
    const u = new AppUpdates(() => {});
    (u as unknown as { ready: boolean }).ready = true;
    return u;
  };

  it('offers Reload for the new version when no game is in progress', () => {
    const html = renderToStaticMarkup(<UpdateNotice updates={ready()} busy={false} />);
    expect(html).toContain('A new version of Chess Nines is ready.');
    expect(html).toMatch(/<button[^>]*>Reload for the new version</);
  });

  it('never during a game, and not before a new version is there', () => {
    expect(renderToStaticMarkup(<UpdateNotice updates={ready()} busy={true} />)).toBe('');
    expect(
      renderToStaticMarkup(<UpdateNotice updates={new AppUpdates(() => {})} busy={false} />),
    ).toBe('');
  });

  it('a game is in progress from its first move (or resignation) until it ends', () => {
    const { game } = newModel(createRulesFor(standard), standard);
    expect(gameInProgress(game)).toBe(false);
    const moved = { ...game, moves: [game.legal[0]!] } as typeof game;
    expect(gameInProgress(moved)).toBe(true);
    const over = { ...moved, result: { status: 'resigned' } } as unknown as typeof game;
    expect(gameInProgress(over)).toBe(false);
  });
});

describe('privacy page', () => {
  it('says the browser keeps a copy of the app to run offline, with the new date', () => {
    const html = renderToStaticMarkup(<Privacy />);
    expect(html).toContain('Cache Storage');
    expect(html).toContain('run offline');
    expect(PRIVACY_UPDATED).toBe('21 November 2026');
  });

  it('names the public contact address (I34, owner, 21 Nov 2026)', () => {
    expect(CONTACT_ADDRESS).toBe('GameTypeBrand@gmail.com');
    expect(renderToStaticMarkup(<Privacy />)).toContain(
      'href="mailto:GameTypeBrand@gmail.com" target="_blank" rel="noopener noreferrer">GameTypeBrand@gmail.com<',
    );
  });
});
