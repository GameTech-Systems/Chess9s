import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation, type Position } from '@chess9s/engine';
import hotSeatMate from '../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import { Game } from './Game';
import { App } from './App';
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
  it('opens on the picker: every ruleset with its status badge, 3-player not playable yet', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Choose a ruleset');
    expect(html).toContain('Draft 2-Player');
    expect(html).toContain('data-status="proposed"');
    expect(html).toContain('data-status="experimental"');
    expect(html).toMatch(/Not playable yet/);
    expect(html).toMatch(/<button[^>]*>Play<\/button>/);
    expect(html).not.toContain('aria-label="Moves"');
  });

  it('the game screen offers a way back to the picker', () => {
    expect(render()).toContain('Change ruleset');
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
});
