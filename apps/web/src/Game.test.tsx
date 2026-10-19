import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation, type Position } from '@chess9s/engine';
import hotSeatMate from '../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import { Game } from './Game';
import { createRules, ruleset } from './game/rules';
import { fromGame, newModel } from './game/session';

const render = (initial = newModel()) => renderToStaticMarkup(<Game initial={initial} />);

describe('Game screen', () => {
  it('starts a game: dark to move, Coast closed, the ruleset id and version shown', () => {
    const html = render();
    expect(html).toContain('Dark to move');
    expect(html).toMatch(/Coast: <strong>closed<\/strong>/);
    expect(html).toContain(`${ruleset.id} v${ruleset.version}`);
    expect(html).toContain('aria-label="Moves"');
    expect(html).toContain('data-hit="e5"');
  });

  it('says what the build does not play yet', () => {
    const html = render();
    expect(html).toContain('Not in this build yet');
    expect(html).toContain('En passant');
  });

  it('shows the end of a full game: checkmate, the winner, the moves, an open Coast', () => {
    let game = newGame(createRules(), ruleset);
    for (const notation of hotSeatMate.moves) {
      game = playMove(
        game,
        game.legal.find((m) => toNotation(m) === notation)!,
      );
    }
    const html = render(fromGame(game));
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
      lost: { light: ['knight'] },
    });
    const html = render({
      game,
      selected: 'b8',
      promoting: { from: 'b8', to: 'b9', choices: ['bishop', 'knight', 'queen', 'rook'] },
    });
    expect(html).toContain('Lost:');
    expect(html).toContain('Light knight');
    for (const piece of ['Bishop', 'Knight', 'Queen', 'Rook', 'Cancel']) {
      expect(html).toContain(`>${piece}</button>`);
    }
    expect(html).toContain('Promote to');
  });
});
