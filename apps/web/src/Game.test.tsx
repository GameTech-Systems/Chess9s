import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation, type Position } from '@chess9s/engine';
import hotSeatMate from '../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import { Game } from './Game';
import { App } from './App';
import { createRules, listRulesets, ruleset } from './game/rules';
import { fromGame, newModel } from './game/session';
import { saveGuest } from './game/guest';

const render = (initial = newModel(), info = ruleset) =>
  renderToStaticMarkup(<Game initial={initial} ruleset={info} />);
const practice = listRulesets().find((r) => r.id === 'draft-2p')!;

describe('Game screen', () => {
  it('starts a game: dark to move, Coast closed, the ruleset id and version shown', () => {
    const html = render();
    expect(html).toContain('Dark to move');
    expect(html).toMatch(/Coast: <strong>closed<\/strong>/);
    expect(html).toContain(`${ruleset.id} v${ruleset.version}`);
    expect(html).toContain('aria-label="Moves"');
    expect(html).toContain('data-hit="e5"');
  });

  it('lists nothing as not built at the draft defaults (S22a built the rest)', () => {
    expect(render()).not.toContain('Not in this build yet');
  });

  it('shows the end of a full game: checkmate, the winner, the moves, an open Coast', () => {
    // The fixture was played under draft-2p (Good Practice), where the King moves 2 squares.
    let game = newGame(createRules('draft-2p'), practice);
    for (const notation of hotSeatMate.moves) {
      game = playMove(
        game,
        game.legal.find((m) => toNotation(m) === notation)!,
      );
    }
    const html = render(fromGame(game), practice);
    expect(html).toContain('Checkmate · Light wins');
    expect(html).toContain('data-result="win"');
    expect(html).toMatch(/Coast: <strong>open<\/strong>/);
    expect(html).toContain('a1-i9');
    // Light’s Dragon Head stands on i9 and the dark King, in check, is marked.
    expect(html).toMatch(/data-piece="light-dragon-head" data-at="i9"/);
    expect(html).toMatch(/data-check="[a-i][1-9]"/);
    // Nothing can be moved once the game is over.
    expect(html).not.toMatch(/tabindex="0"/);
  });

  it('lists lost pieces, and a pawn waiting to promote offers its choices', () => {
    const king = (side: string) => ({ piece: 'king', side });
    const position: Position = {
      f9: king('dark'),
      f1: king('light'),
      b8: { piece: 'pawn', side: 'light' },
    };
    const game = newGame(createRules(), ruleset, {
      position,
      turn: 'light',
      lost: { light: ['knight', 'pawn', 'pawn'] },
    });
    const html = render({
      ...fromGame(game),
      selected: 'b8',
      promoting: { from: 'b8', to: 'b9', choices: ['bishop', 'knight', 'queen', 'rook'] },
    });
    expect(html).toContain('Light lost: knight, pawn ×2');
    for (const piece of ['Bishop', 'Knight', 'Queen', 'Rook', 'Cancel']) {
      expect(html).toContain(`>${piece}</button>`);
    }
    expect(html).toContain('Promote to');
  });
});

describe('Rule picker', () => {
  it('opens on the picker: every ruleset with its status badge, the 3-player presets playable', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Choose a ruleset');
    for (const name of ['Standard', 'Easy Start', 'Good Practice', 'Standard (3-player)']) {
      expect(html).toContain(name);
    }
    // Standard comes first and is marked as the default.
    expect(html.indexOf('Standard')).toBeLessThan(html.indexOf('Good Practice'));
    expect(html).toMatch(/Standard<\/strong>[\s\S]*?class="default-tag"[^>]*>Default</);
    // The 3-player presets: Standard first, marked Default for 3 players (D63), each experimental.
    expect(html).toMatch(
      /Standard \(3-player\)<\/strong>[\s\S]*?class="default-tag"[^>]*>Default for 3 players</,
    );
    expect(html.indexOf('Standard (3-player)')).toBeLessThan(html.indexOf('Easy Start (3-player)'));
    expect(html.indexOf('Standard (3-player)')).toBeLessThan(
      html.indexOf('Good Practice (3-player)'),
    );
    for (const id of ['standard-3p', 'easy-3p', 'draft-3p']) {
      expect(html).toContain(`href="/rules/${id}"`);
    }
    expect(html).toContain('href="/rules/standard-2p"');
    expect(html).toContain('href="/rules/draft-2p"');
    expect(html).toContain('data-status="candidate"');
    expect(html).toContain('data-status="experimental"');
    expect(html).not.toMatch(/Not playable yet/);
    expect(html).toMatch(/<button[^>]*>Play<\/button>/);
    expect(html).not.toContain('aria-label="Moves"');
  });

  it('the game screen offers Play online and joining a room, when the app wires them (S53)', () => {
    const html = renderToStaticMarkup(
      <Game initial={newModel()} ruleset={ruleset} onPlayOnline={() => {}} onJoinRoom={() => {}} />,
    );
    expect(html).toContain('>Play online<');
    expect(html).toContain('Join a room');
    expect(render()).not.toContain('Play online');
  });

  it('the game screen offers a way back to the picker', () => {
    expect(render()).toContain('Change ruleset');
  });

  it('the game screen offers to save and open a game record (S46)', () => {
    const html = render();
    expect(html).toContain('Save game record');
    expect(html).toContain('Open game record');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save game record/);
  });
});

describe('play aids on the screen', () => {
  it('has the legal-moves toggle on, the danger toggle off, and undo disabled at the start', () => {
    const html = render();
    expect(html).toMatch(/aria-pressed="true"[^>]*>Show legal moves/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Show danger/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Undo/);
  });
});

describe('play aids, part 2', () => {
  it('has a sound toggle (on), an elapsed display and a "?" rules button', () => {
    const html = render();
    expect(html).toMatch(/aria-pressed="true"[^>]*>Sound/);
    expect(html).toMatch(/aria-label="Elapsed time"[^>]*>0:00</);
    expect(html).toMatch(/<button[^>]*aria-label="Rules"[^>]*>\?<\/button>/);
    expect(html).not.toContain('role="dialog"');
  });

  it('the rules screen names the ruleset and what is not built', async () => {
    const { RulesScreen } = await import('./Rules');
    const html = renderToStaticMarkup(
      <RulesScreen ruleset={ruleset} missing={['En passant']} onClose={() => {}} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain(`${ruleset.id} v${ruleset.version}`);
    expect(html).toContain('En passant');
    expect(html).toContain('>Close<');
  });

  it('the rules screen links to the full rules of the ruleset in play', async () => {
    const { RulesScreen } = await import('./Rules');
    const { RULES_DOC_URL } = await import('./links');
    const html = renderToStaticMarkup(
      <RulesScreen ruleset={practice} missing={[]} onClose={() => {}} />,
    );
    expect(html).toMatch(/href="\/rules\/draft-2p"[^>]*>Full rules for Good Practice</);
    expect(html).toContain(`href="${RULES_DOC_URL}"`);
    // What sets this ruleset apart from the others is named.
    expect(html).toContain('Every setting at its default');
    const standard = renderToStaticMarkup(
      <RulesScreen ruleset={ruleset} missing={[]} onClose={() => {}} />,
    );
    expect(standard).toMatch(/King range[\s\S]*?1/);
  });
});

describe('computer opponent and guest play', () => {
  it('offers a mode choice, hot-seat by default', () => {
    const html = render();
    expect(html).toContain('aria-label="Opponent"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Hot-seat</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Computer</);
  });

  it('restores a saved computer game', () => {
    let game = newGame(createRules(), ruleset);
    game = playMove(game, game.legal[0]!);
    const data = new Map<string, string>();
    const store = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
    saveGuest(store, { game, mode: 'computer' });
    const html = renderToStaticMarkup(<Game store={store} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Computer</);
    expect(html).toContain(game.moves[0]!.notation);
  });
});
