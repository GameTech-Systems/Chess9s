// What the 3-player screens say (S57, decision 0016): the seats, the notices a move leaves, and a
// result for every row of both end tables. The games are the engine's recorded ones
// (packages/engine/test/fixtures/games/three-player-ends.json), replayed from the start.
import { describe, expect, it } from 'vitest';
import { newGame, playMove, resign, timeOut, toNotation, type GameState } from '@chess9s/engine';
import ends from '../../../../packages/engine/test/fixtures/games/three-player-ends.json';
import { newModel } from './session';
import { createRules, listRulesets } from './rules';
import {
  noticeLines,
  phaseLine,
  resignable,
  resignPrompt,
  resultCard,
  seatLines,
} from './threeText';
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

describe('a resignation (S67, decision 0018)', () => {
  const info = listRulesets().find((r) => r.id === 'standard-3p')!;
  const fresh = () => newModel(createRules('standard-3p'), info).game;

  it('shows the seat that resigned as out, and says what became of it', () => {
    const g = resign(fresh(), 'light');
    expect(seatLines(g).find((s) => s.side === 'light')!.text).toBe('out · resigned');
    expect(noticeLines(g)).toEqual([
      'Light resigned. Its King leaves the board and its other pieces are stone.',
    ]);
    expect(phaseLine(g)).toBe('The duel: Dark against the Dragon.');
  });

  it('says the Dragon resigned: all its pieces, the Tail too, are stone', () => {
    const g = resign(fresh(), 'dragon');
    expect(seatLines(g).find((s) => s.side === 'dragon')!.text).toBe('out · resigned');
    expect(noticeLines(g)).toEqual([
      'The Dragon resigned. All its pieces, the Tail too, are stone.',
    ]);
  });

  it('keeps the notice of the move before a resignation, then says who resigned', () => {
    let g = fresh();
    g = playMove(g, g.legal[0]!);
    expect(noticeLines(resign(g, 'dragon'))).toHaveLength(1);
  });

  it('puts the result on the card when the resignation ends the game', () => {
    const g = resign(resign(fresh(), 'light'), 'dark');
    expect(resultCard(g)).toEqual({
      tone: 'win',
      heading: 'The Dragon wins',
      detail: 'Dark resigned.',
    });
    expect(seatLines(g).find((s) => s.side === 'dark')!.text).toBe('resigned');
  });
});

describe('capturing the Tail reads as a capture, not a checkmate (S67)', () => {
  it('says the Tail was captured and turns to stone, and the duel win names the capture', () => {
    const info = listRulesets().find((r) => r.id === 'standard-3p')!;
    const piece = (side: string, name: string) => ({ piece: name, side, moved: true });
    const base = createRules('standard-3p');
    const rules = { ...base, values: { ...base.values, 'tail.capturable': true } };
    const start = newGame(rules, info, {
      turn: 'light',
      position: {
        a1: piece('dragon', 'dark-dragon-head'),
        b7: piece('dark', 'king'),
        e2: piece('light', 'king'),
        g8: piece('light', 'knight'),
        h8: piece('dragon', 'moon'),
        i9: piece('dragon', 'dragon-tail'),
      },
    });
    const g = playMove(
      start,
      start.legal.find((m) => toNotation(m) === 'g8xi9')!,
    );
    expect(noticeLines(g)).toEqual([
      "Light captured the Dragon's Tail; it turns to stone on g8. The Dragon plays on without it.",
    ]);
    const duel = newGame(rules, info, {
      turn: 'dark',
      seats: { dark: 'active', light: 'out', dragon: 'active' },
      position: {
        a1: piece('dragon', 'dark-dragon-head'),
        b7: piece('dark', 'king'),
        g8: piece('dark', 'knight'),
        h8: piece('dragon', 'moon'),
        i9: piece('dragon', 'dragon-tail'),
      },
    });
    const won = playMove(
      duel,
      duel.legal.find((m) => toNotation(m) === 'g8xi9')!,
    );
    expect(resultCard(won)!.detail).toBe("Dark captured the Dragon's Tail.");
  });
});

describe('who can resign, and what the confirm step says (S67)', () => {
  const info = listRulesets().find((r) => r.id === 'standard-3p')!;
  const fresh = () => newModel(createRules('standard-3p'), info).game;

  it('offers every seat a person plays that is still in; never the computer, never a seat that is out', () => {
    expect(resignable(fresh(), [])).toEqual(['dark', 'light', 'dragon']);
    expect(resignable(fresh(), ['dragon'])).toEqual(['dark', 'light']);
    expect(resignable(fresh(), ['light', 'dragon'])).toEqual(['dark']);
    expect(resignable(resign(fresh(), 'light'), [])).toEqual(['dark', 'dragon']);
    expect(resignable(resign(resign(fresh(), 'light'), 'dark'), [])).toEqual([]);
  });

  it('tells a Kinged player its King leaves and its pieces turn to stone', () => {
    expect(resignPrompt(fresh(), 'light')).toBe(
      'Light resigns? Its King leaves the board and its other pieces turn to stone. Dark and the Dragon play on.',
    );
  });

  it('tells the Dragon all its pieces, the Tail too, turn to stone', () => {
    expect(resignPrompt(fresh(), 'dragon')).toBe(
      'The Dragon resigns? All its pieces, the Tail too, turn to stone. Dark and Light play on.',
    );
  });

  it('says the game ends when it does', () => {
    const duel = resign(fresh(), 'light');
    expect(resignPrompt(duel, 'dark')).toBe('Dark resigns? The game ends and the Dragon wins.');
    expect(resignPrompt(duel, 'dragon')).toBe('The Dragon resigns? The game ends and Dark wins.');
  });
});

describe('running out of time (S65, D66)', () => {
  const info = listRulesets().find((r) => r.id === 'standard-3p')!;
  const fresh = () => newModel(createRules('standard-3p'), info).game;

  it('shows the seat as out of time and says what became of it', () => {
    const g = timeOut(fresh(), 'light');
    expect(seatLines(g).find((s) => s.side === 'light')!.text).toBe('out · out of time');
    expect(noticeLines(g)).toEqual([
      'Light ran out of time. Its King leaves the board and its other pieces are stone.',
    ]);
    expect(phaseLine(g)).toBe('The duel: Dark against the Dragon.');
  });

  it('says the Dragon ran out of time: all its pieces, the Tail too, are stone', () => {
    const g = timeOut(fresh(), 'dragon');
    expect(noticeLines(g)).toEqual([
      'The Dragon ran out of time. All its pieces, the Tail too, are stone.',
    ]);
  });

  it('puts the result on the card when running out of time ends the game', () => {
    const g = timeOut(timeOut(fresh(), 'light'), 'dark');
    expect(resultCard(g)).toEqual({
      tone: 'win',
      heading: 'The Dragon wins',
      detail: 'Dark ran out of time.',
    });
    const h = timeOut(timeOut(fresh(), 'light'), 'dragon');
    expect(resultCard(h)).toEqual({
      tone: 'win',
      heading: 'Dark wins',
      detail: 'The Dragon ran out of time.',
    });
  });

  it('a resignation still reads as one', () => {
    expect(seatLines(resign(fresh(), 'light')).find((s) => s.side === 'light')!.text).toBe(
      'out · resigned',
    );
  });
});
