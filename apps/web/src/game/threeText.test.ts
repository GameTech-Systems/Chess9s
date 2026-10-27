// What the 3-player screens say (S57, decision 0016): the seats, the notices a move leaves, and a
// result for every row of both end tables. The games are the engine's recorded ones
// (packages/engine/test/fixtures/games/three-player-ends.json), replayed from the start.
import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation, type GameState } from '@chess9s/engine';
import ends from '../../../../packages/engine/test/fixtures/games/three-player-ends.json';
import { newModel } from './session';
import { createRules, listRulesets } from './rules';
import { phaseLine, resultCard, seatLines, noticeLines } from './threeText';
import { statusLine } from './session';

interface Recorded {
  ruleset: string;
  rows: string[];
  moves: string[];
  result: GameState['result'];
}
const games = ends.games as Recorded[];

function replay(id: string, moves: string[]): GameState {
  const info = listRulesets().find((r) => r.id === id)!;
  let { game } = newModel(createRules(id), info);
  for (const notation of moves) {
    game = playMove(
      game,
      game.legal.find((m) => toNotation(m) === notation)!,
    );
  }
  return game;
}
const find = (id: string, row: string) =>
  games.find((g) => g.ruleset === id && g.rows.includes(row))!;
const play = (id: string, row: string, upTo?: number) => {
  const g = find(id, row);
  return replay(id, upTo === undefined ? g.moves : g.moves.slice(0, upTo));
};

describe('the result of a 3-player game, for every row of both end tables', () => {
  const cases: [string, string, string, string][] = [
    // [ruleset, row, heading, detail]
    ['standard-3p', 'kinged-checkmates-king', 'Dark wins', "Dark checkmated Light's King."],
    ['easy-3p', 'kinged-checkmates-king', 'Light wins', "Light checkmated Dark's King."],
    ['easy-3p', 'kinged-checkmates-tail', 'Dark wins', "Dark checkmated the Dragon's Tail."],
    ['easy-3p', 'dragon-checkmates-king', 'The Dragon wins', "The Dragon checkmated Light's King."],
    ['standard-3p', 'duel-dragon-wins', 'The Dragon wins', "The Dragon checkmated Dark's King."],
    ['draft-3p', 'duel-dragon-wins', 'The Dragon wins', "The Dragon captured Light's King."],
    [
      'standard-3p',
      'duel-kinged-wins',
      'Dark wins',
      'Dark captured both Dragon Heads, the Sun and the Moon.',
    ],
    ['draft-3p', 'draw-both-kings', 'Draw', 'Fifty-move rule. Dark and Light share the draw.'],
    ['draft-3p', 'draw-duel', 'Draw', 'Fifty-move rule. Dark and the Dragon share the draw.'],
    ['draft-3p', 'dragon-out', 'Draw', 'Insufficient material. Dark and Light share the draw.'],
    ['easy-3p', 'draw', 'Draw', 'Stalemate. Dark, Light and the Dragon share the draw.'],
  ];

  it.each(cases)('%s %s', (id, row, heading, detail) => {
    const game = play(id, row);
    expect(game.result.status).not.toBe('ongoing');
    const card = resultCard(game);
    expect(card).toEqual({
      tone: game.result.status === 'win' ? 'win' : 'draw',
      heading,
      detail,
    });
    // The status line is the short form of the same thing.
    expect(statusLine(game)).toContain(heading === 'Draw' ? 'draw' : heading.replace('The ', ''));
  });

  it('is none while the game goes on', () => {
    expect(resultCard(newModel(createRules('standard-3p'), listRulesets()[3]!).game)).toBeNull();
  });
});

describe('the exposed-King and Tail-capture wins read like the table', () => {
  it('names the King left in check for a player who moves before it can answer (rule 6)', () => {
    const game = {
      ...play('standard-3p', 'kinged-checkmates-king'),
      result: { status: 'win', winner: 'dark', loser: 'light', reason: 'exposed-king' },
    } as GameState;
    expect(resultCard(game)!.detail).toBe("Light's King was left in check from Dark.");
  });
});

describe('the seats', () => {
  it('lists the three seats in turn order, the one to move marked', () => {
    const g = replay('standard-3p', []);
    expect(seatLines(g).map((s) => [s.side, s.name, s.toMove, s.state])).toEqual([
      ['dark', 'Dark', true, 'active'],
      ['light', 'Light', false, 'active'],
      ['dragon', 'Dragon', false, 'active'],
    ]);
  });

  it('shows a side that is out: the Dragon captured its King', () => {
    const g = play('standard-3p', 'dragon-captures-king');
    const moves = find('standard-3p', 'dragon-captures-king').moves;
    let at = replay('standard-3p', []);
    let n = 0;
    for (const notation of moves) {
      at = playMove(
        at,
        at.legal.find((m) => toNotation(m) === notation)!,
      );
      n++;
      if (at.moves.at(-1)?.events?.some((e) => e.kind === 'king-captured')) break;
    }
    expect(n).toBeLessThan(moves.length);
    const out = seatLines(at).filter((s) => s.state === 'out');
    expect(out).toHaveLength(1);
    expect(out[0]!.text).toBe('out · King captured');
    expect(g.result.status).toBe('win');
  });

  it('ends nobody to move once the game is over', () => {
    const g = play('easy-3p', 'kinged-checkmates-tail');
    expect(seatLines(g).some((s) => s.toMove)).toBe(false);
  });
});

describe('notices and the phase of the game', () => {
  it('says when the Dragon captures a King: that side is out and the duel begins', () => {
    const full = find('standard-3p', 'dragon-captures-king').moves;
    let found: GameState | undefined;
    let g = replay('standard-3p', []);
    for (const notation of full) {
      g = playMove(
        g,
        g.legal.find((m) => toNotation(m) === notation)!,
      );
      if (g.moves.at(-1)?.events?.some((e) => e.kind === 'king-captured')) {
        found = g;
        break;
      }
    }
    expect(found).toBeDefined();
    const lines = noticeLines(found!);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/King was (captured|checkmated) by the Dragon\. \w+ is out/);
    expect(phaseLine(found!)).toMatch(/^The duel: \w+ against the Dragon\.$/);
  });

  it('says when the Tail is checkmated and turns to stone', () => {
    // Decision 0016 rules 7 to 9: light's knight checkmates the Tail and swaps places with it.
    const info = listRulesets().find((r) => r.id === 'standard-3p')!;
    const piece = (side: string, name: string) => ({ piece: name, side, moved: true });
    const start = newGame(createRules('standard-3p'), info, {
      turn: 'light',
      position: {
        a1: piece('dragon', 'dark-dragon-head'),
        b7: piece('dark', 'king'),
        c9: piece('light', 'rook'),
        e2: piece('light', 'king'),
        e7: piece('light', 'knight'),
        f6: piece('light', 'bishop'),
        h8: piece('dragon', 'moon'),
        h9: piece('dragon', 'sun'),
        i6: piece('light', 'rook'),
        i8: piece('dragon', 'light-dragon-head'),
        i9: piece('dragon', 'dragon-tail'),
      },
    });
    const g = playMove(
      start,
      start.legal.find((m) => toNotation(m) === 'e7-g8')!,
    );
    expect(noticeLines(g)).toEqual([
      "Light checkmated the Dragon's Tail; it turns to stone on g8. The Dragon plays on without it.",
    ]);
    expect(phaseLine(g)).toBe("The Dragon's Tail is in stone. The Dragon plays on without it.");
    const dragon = seatLines(g).find((s) => s.side === 'dragon')!;
    expect(dragon).toMatchObject({
      state: 'tail-stone',
      toMove: true,
      text: 'to move · Tail in stone',
    });
  });

  it('says when the Dragon is out and the Kinged players play on', () => {
    const g = play('draft-3p', 'dragon-out');
    expect(phaseLine(g)).toBe('The Dragon is out. Dark and Light play on.');
  });

  it('has nothing to say in an ordinary position', () => {
    const g = replay('standard-3p', []);
    expect(noticeLines(g)).toEqual([]);
    expect(phaseLine(g)).toBeNull();
  });
});
