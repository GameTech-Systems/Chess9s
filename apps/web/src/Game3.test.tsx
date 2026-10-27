// The 3-player hot-seat screen (S57, decision 0016): the board turns to the side to move, the
// seats and their states, a result screen for every end, the rules page of each preset and the
// game record.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  newGame,
  playMove,
  toNotation,
  type GameState,
  type PlacedPiece,
  type Position,
  type Seats,
} from '@chess9s/engine';
import ends from '../../../packages/engine/test/fixtures/games/three-player-ends.json';
import { App } from './App';
import { Game } from './Game';
import { RulesPage } from './RulesPage';
import { createRules, listRulesets, rulesetSettings } from './game/rules';
import { openRecord, recordJson } from './game/record';
import { saveGuest, type Store } from './game/guest';
import { choose, click, fromGame, newModel, type Model } from './game/session';
import registry from '../../../rules/parameters.json';
import dragonMates from '../scripts/draft-3p-dragon-mates.json';

const info = (id: string) => listRulesets().find((r) => r.id === id)!;
const render = (model: Model, id = 'standard-3p') =>
  renderToStaticMarkup(<Game initial={model} ruleset={info(id)} />);
const fresh = (id = 'standard-3p') => newModel(createRules(id), info(id));

function replay(id: string, moves: readonly string[]): GameState {
  let { game } = fresh(id);
  for (const notation of moves) {
    game = playMove(
      game,
      game.legal.find((m) => toNotation(m) === notation)!,
    );
  }
  return game;
}
const recorded = (id: string, row: string) =>
  ends.games.find((g) => g.ruleset === id && g.rows.includes(row))!;

function position(pieces: Record<string, string>): Position {
  return Object.fromEntries(
    Object.entries(pieces).map(([at, text]) => {
      const [side, piece, stone] = text.split(' ');
      const placed: PlacedPiece = { piece: piece!, side: side!, moved: true };
      return [at, stone === 'stone' ? { ...placed, stone: true } : placed] as const;
    }),
  );
}
const model = (pieces: Record<string, string>, turn: string, seats?: Seats, id = 'standard-3p') =>
  fromGame(
    newGame(createRules(id), info(id), {
      position: position(pieces),
      turn,
      ...(seats && { seats }),
    }),
  );

describe('the board turns to the side to move', () => {
  const kings = { e1: 'light king', e9: 'dark king', a5: 'dragon dragon-tail' };

  it.each([
    ['dark', 'dark seat'],
    ['light', 'light seat'],
    ['dragon', 'dragon seat'],
  ])('%s to move: the board is drawn from the %s', (turn, seat) => {
    const html = render(model(kings, turn));
    expect(html).toContain(`Chess Nines board, ${seat}`);
    expect(html).toContain(`${turn.charAt(0).toUpperCase()}${turn.slice(1)} to move`);
  });

  it('starts on Follow turn in 3-player games, and offers the Dragon view', () => {
    const html = render(fresh());
    expect(html).toMatch(/aria-pressed="true"[^>]*>Follow turn</);
    for (const label of ['Light', 'Dark', 'Dragon', 'Follow turn']) {
      expect(html).toMatch(new RegExp(`aria-pressed="(true|false)"[^>]*>${label}<`));
    }
    // The Dragon's own view: a1 at the bottom right (the board data's rotation, 270).
    expect(html).toContain('Chess Nines board, dark seat');
  });

  it('draws the Ting Yang symbol turned for 3 players', () => {
    expect(render(fresh())).toContain('data-ting-yang-turn="90"');
  });

  it('keeps the 2-player screen as it was: Light view, no seat list, Opponent choice', () => {
    const html = renderToStaticMarkup(<Game initial={newModel()} />);
    expect(html).toContain('Chess Nines board, light seat');
    expect(html).not.toContain('aria-label="Seats"');
    expect(html).toContain('aria-label="Opponent"');
    expect(html).toContain('data-ting-yang-turn="0"');
  });
});

describe('the seats', () => {
  it('lists the three seats in turn order with whose turn it is', () => {
    const html = render(fresh());
    expect(html).toContain('aria-label="Seats"');
    expect(html.match(/data-seat="(dark|light|dragon)"/g)).toEqual([
      'data-seat="dark"',
      'data-seat="light"',
      'data-seat="dragon"',
    ]);
    expect(html).toMatch(/data-seat="dark" data-turn="true"/);
    expect(html).toMatch(/data-seat="light" data-turn="false"/);
  });

  it('shows each seat with a clock, for display only (untimed, decision 0017)', () => {
    const html = render(fresh());
    expect(html.match(/aria-label="(Dark|Light|Dragon) time"/g)).toHaveLength(3);
    expect(html).toContain('Untimed');
  });

  it('shows a side that is out, and its pieces as stone', () => {
    const html = render(
      model(
        {
          e9: 'dark king',
          c8: 'dark rook',
          c4: 'light rook stone',
          a5: 'dragon dragon-tail',
        },
        'dark',
        { light: 'out' } as Seats,
      ),
    );
    expect(html).toMatch(/data-seat="light" data-turn="false" data-state="out"/);
    expect(html).toContain('out · King captured');
    expect(html).toMatch(/data-piece="rook" data-at="c4" data-side="light" data-stone=""/);
  });

  it('shows the Tail in stone', () => {
    const html = render(
      model(
        { e1: 'light king', e9: 'dark king', g4: 'dragon dragon-tail stone', i9: 'dragon sun' },
        'dragon',
        { dragon: 'tail-stone' } as Seats,
      ),
    );
    expect(html).toMatch(/data-seat="dragon" data-turn="true" data-state="tail-stone"/);
    expect(html).toContain('Tail in stone');
    expect(html).toMatch(/data-piece="dragon-tail" data-at="g4" data-side="dragon" data-stone=""/);
  });

  it('says what the last move did, and where the game stands', () => {
    const moves = recorded('standard-3p', 'dragon-captures-king').moves;
    let game = fresh().game;
    for (const notation of moves) {
      game = playMove(
        game,
        game.legal.find((m) => toNotation(m) === notation)!,
      );
      if (game.moves.at(-1)?.events?.some((e) => e.kind === 'king-captured')) break;
    }
    const html = render(fromGame(game));
    expect(html).toMatch(/King was captured by the Dragon\. \w+ is out/);
    expect(html).toMatch(/The duel: \w+ against the Dragon\./);
  });
});

describe('a result screen for every end', () => {
  const cases: [string, string, string, RegExp][] = [
    ['easy-3p', 'kinged-checkmates-tail', 'Dark wins', /Dark checkmated the Dragon&#x27;s Tail\./],
    [
      'easy-3p',
      'dragon-checkmates-king',
      'The Dragon wins',
      /The Dragon checkmated Light&#x27;s King\./,
    ],
    ['draft-3p', 'kinged-checkmates-king', 'Dark wins', /Dark checkmated Light&#x27;s King\./],
    ['draft-3p', 'duel-dragon-wins', 'The Dragon wins', /The Dragon captured Light&#x27;s King\./],
    [
      'standard-3p',
      'duel-dragon-wins',
      'The Dragon wins',
      /The Dragon checkmated Dark&#x27;s King\./,
    ],
    [
      'standard-3p',
      'duel-kinged-wins',
      'Dark wins',
      /Dark captured both Dragon Heads, the Sun and the Moon\./,
    ],
    ['draft-3p', 'draw-both-kings', 'Draw', /Dark and Light share the draw\./],
    ['draft-3p', 'draw-duel', 'Draw', /Dark and the Dragon share the draw\./],
    ['easy-3p', 'draw', 'Draw', /Dark, Light and the Dragon share the draw\./],
  ];

  it.each(cases)('%s %s', (id, row, heading, detail) => {
    const game = replay(id, recorded(id, row).moves);
    const html = render(fromGame(game), id);
    expect(html).toContain('aria-label="Result"');
    expect(html).toContain(`>${heading}<`);
    expect(html).toMatch(detail);
    expect(html).toContain(`data-result="${game.result.status}"`);
    // Nothing can be moved once the game is over, and the way to a new game is there.
    expect(html).not.toMatch(/data-hit="[a-i][1-9]"[^>]*tabindex="0"/);
    expect(html).toContain('>New game<');
  });

  it('shows no result while the game goes on', () => {
    expect(render(fresh())).not.toContain('aria-label="Result"');
  });
});

describe('a move that asks a question', () => {
  const twoCheckers = {
    a1: 'dragon dark-dragon-head',
    b7: 'dark king',
    c9: 'light rook',
    e2: 'light king',
    e7: 'dark knight',
    e9: 'light bishop',
    f6: 'light bishop',
    h8: 'dragon moon',
    i6: 'light rook',
    i8: 'dragon light-dragon-head',
    i9: 'dragon dragon-tail',
  };

  it('asks which piece checkmates the Tail, with a button per piece and Cancel', () => {
    const m = [
      ['e7', 'g8'],
      ['e9', 'd8'],
    ].reduce((acc, [from, to]) => click(click(acc, from!), to!), model(twoCheckers, 'dark'));
    const html = render(m);
    expect(html).toContain('aria-label="Which piece checkmates the Tail"');
    expect(html).toContain('>c9 rook<');
    expect(html).toContain('>g8 knight<');
    expect(html).toContain('>Cancel<');
    expect(render(choose(m, 'g8'))).not.toContain('Which piece checkmates');
  });
});

describe('hot-seat only, until the computer and the room take 3 players', () => {
  it('offers no Computer and no Play online on the game screen', () => {
    const html = renderToStaticMarkup(
      <Game initial={fresh()} ruleset={info('standard-3p')} onPlayOnline={() => {}} />,
    );
    expect(html).not.toContain('aria-label="Opponent"');
    expect(html).not.toContain('>Play online<');
  });

  it('opens a 3-player game from the picker route', () => {
    const html = renderToStaticMarkup(<App path="/" />);
    expect(html).toContain('Standard (3-player)');
  });
});

describe('the rules page of each 3-player preset', () => {
  it.each(['standard-3p', 'draft-3p', 'easy-3p'])('%s lists every 3-player setting', (id) => {
    const html = renderToStaticMarkup(<RulesPage id={id} onPlay={() => {}} />);
    const three = registry.parameters.filter(
      (p) => p.status !== 'deprecated' && p.players.includes(3),
    );
    const settings = rulesetSettings(id);
    expect(settings.map((s) => s.id)).toEqual(three.map((p) => p.id));
    for (const s of settings) expect(html, s.id).toContain(`data-setting="${s.id}"`);
    expect(html).toContain('3 players');
    expect(html).toMatch(/Play [^<]*<\/button>/);
    // The Dragon rules are on it.
    expect(html).toContain('data-setting="endings.3p"');
    expect(html).toContain('data-setting="check.3p.exposedKing"');
    // The 2-player pawn table is not.
    expect(html).not.toContain('Pawn colors and safe zones');
  });

  it('the default 3-player preset says so', () => {
    expect(renderToStaticMarkup(<RulesPage id="standard-3p" />)).toContain(
      'the default 3-player ruleset',
    );
  });
});

describe('the 3-player game record', () => {
  it('saves a game and opens it again on the same ruleset, with the same result', () => {
    const rec = recorded('easy-3p', 'kinged-checkmates-tail');
    const game = replay('easy-3p', rec.moves);
    const text = recordJson(game, '2026-10-27');
    const saved = JSON.parse(text) as { players: number; turnOrder: string[]; result: unknown };
    expect(saved.players).toBe(3);
    expect(saved.turnOrder).toEqual(['dark', 'light', 'dragon']);
    const opened = openRecord(text);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.info.id).toBe('easy-3p');
    expect(opened.game.result).toEqual(game.result);
    expect(opened.game.moves.map((m) => m.notation)).toEqual(rec.moves);
  });

  it('round-trips a game with a duel, stones and a draw between the Kinged players', () => {
    for (const [id, row] of [
      ['standard-3p', 'duel-dragon-wins'],
      ['draft-3p', 'draw-both-kings'],
    ] as const) {
      const game = replay(id, recorded(id, row).moves);
      const opened = openRecord(recordJson(game, '2026-10-27'));
      expect(opened.ok, `${id} ${row}`).toBe(true);
      if (opened.ok) expect(opened.game.result).toEqual(game.result);
    }
  });

  it('refuses a record whose result its moves do not give', () => {
    const game = replay('easy-3p', recorded('easy-3p', 'kinged-checkmates-tail').moves);
    const tampered = JSON.stringify({
      ...JSON.parse(recordJson(game, '2026-10-27')),
      result: { status: 'win', winner: 'light', loser: 'dragon', reason: 'checkmate' },
    });
    expect(openRecord(tampered)).toMatchObject({ ok: false });
  });

  it('enables Save game record once a move is played', () => {
    const game = replay(
      'standard-3p',
      recorded('standard-3p', 'kinged-checkmates-king').moves.slice(0, 2),
    );
    const html = render(fromGame(game));
    expect(html).toMatch(/<button type="button">Save game record<\/button>/);
  });
});

describe('the Good Practice game the browser check plays (apps/web/scripts)', () => {
  it('has the Dragon capture a King and then checkmate the other', () => {
    let { game } = fresh('draft-3p');
    const events: string[] = [];
    for (const notation of dragonMates.moves) {
      const move = game.legal.find((m) => toNotation(m) === notation);
      expect(move, notation).toBeDefined();
      game = playMove(game, move!);
      for (const e of game.moves.at(-1)?.events ?? []) events.push(e.kind);
    }
    expect(events).toEqual(['king-captured']);
    expect(game.result).toEqual(dragonMates.result);
    expect(game.result).toMatchObject({ winner: 'dragon', reason: 'checkmate' });
  });
});

describe('the computer in 3-player games (S58)', () => {
  const memory = (): Store => {
    const data = new Map<string, string>();
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  };

  it('offers a person per seat to hand to the computer, none by default, at the Greedy level', () => {
    const html = render(fresh());
    expect(html).toContain('aria-label="Computer seats"');
    for (const label of ['Dark', 'Light', 'Dragon']) {
      expect(html).toMatch(new RegExp(`aria-pressed="false"[^>]*>${label}<`));
    }
    expect(html).toContain('Greedy');
    expect(html).not.toContain('aria-label="Opponent"');
  });

  it('restores a saved game with a computer Dragon, and marks that seat', () => {
    const { game } = fresh();
    const store = memory();
    saveGuest(store, { game, mode: 'hot-seat', bots: ['dragon'] });
    const html = renderToStaticMarkup(<Game store={store} ruleset={info('standard-3p')} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Dragon</);
    expect(html).toMatch(
      /data-seat="dragon"[^>]*><span class="seat-name">Dragon<\/span><span class="seat-bot">Computer<\/span>/,
    );
    expect(html.match(/seat-bot/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Dark</);
  });

  it('leaves the 2-player screen as it was', () => {
    const html = renderToStaticMarkup(<Game ruleset={info('standard-2p')} store={null} />);
    expect(html).toContain('aria-label="Opponent"');
    expect(html).not.toContain('Computer seats');
  });
});
