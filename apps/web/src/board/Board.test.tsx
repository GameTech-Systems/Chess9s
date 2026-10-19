import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Board } from './Board';
import { boardData, pieceLetters } from './data';

const render = (props: Partial<Parameters<typeof Board>[0]> = {}) =>
  renderToStaticMarkup(<Board board={boardData} pieceLetters={pieceLetters} {...props} />);
const count = (html: string, needle: RegExp) => (html.match(needle) ?? []).length;

describe('Board', () => {
  it('draws 81 squares', () => {
    expect(count(render(), /data-square="/g)).toBe(81);
  });

  it('places every start-position piece: 37 in a 2-player game (18 + 18 + the Tail)', () => {
    expect(count(render({ players: 2 }), /data-piece="/g)).toBe(37);
  });

  it('places the 3-player start position from the data', () => {
    const three = boardData.setups.find((s) => s.players === 3)!;
    const expected = Object.values(three.pieces).reduce((n, p) => n + Object.keys(p).length, 0);
    expect(count(render({ players: 3 }), /data-piece="/g)).toBe(expected);
  });

  it('puts each piece on its square with its letter from the piece data', () => {
    const html = render();
    expect(html).toMatch(/data-piece="king" data-at="f1"[^>]*>[\s\S]*?>K</);
    expect(html).toMatch(/data-piece="light-dragon-head" data-at="a1"[^>]*>[\s\S]*?>LH</);
  });

  it('draws every special square type from the board data', () => {
    const html = render();
    for (const t of boardData.squareTypes) {
      expect(html, `square type ${t.id}`).toContain(`data-type-${t.id}=""`);
    }
  });

  it('draws the tetrahedron on e5 and the Ting Yang placeholder on i5, not an arrow', () => {
    const html = render();
    expect(html).toContain('data-tetrahedron');
    expect(html).toContain('data-ting-yang');
    expect(html).not.toContain('data-arrow');
  });

  it('turns the Ting Yang symbol 90 degrees clockwise in 3-player games', () => {
    expect(render({ players: 2 })).toContain('data-ting-yang-turn="0"');
    expect(render({ players: 3 })).toContain('data-ting-yang-turn="90"');
  });

  it('moves squares with the seat view: a1 is bottom left for light, top right for dark, bottom right for Dragon', () => {
    const cell = (html: string, at: string) =>
      new RegExp(`data-square="${at}" data-col="(\\d)" data-row="(\\d)"`)
        .exec(html)!
        .slice(1)
        .map(Number);
    expect(cell(render({ seat: 'light' }), 'a1')).toEqual([0, 8]);
    expect(cell(render({ seat: 'dark' }), 'a1')).toEqual([8, 0]);
    expect(cell(render({ seat: 'dragon' }), 'a1')).toEqual([8, 8]);
  });

  it('labels the board for screen readers and gives each square an accessible name', () => {
    const html = render();
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Chess Nines board, light seat"');
    expect(html).toMatch(/<title>e5 · Center/);
  });

  describe('in a game', () => {
    const position = {
      f1: { piece: 'king', side: 'light' },
      f9: { piece: 'king', side: 'dark' },
      a5: { piece: 'dragon-tail', side: 'neutral' },
    };
    const highlights = {
      selected: 'f1',
      targets: [
        { at: 'f2', capture: false },
        { at: 'g2', capture: true },
      ],
      lastMove: ['b8', 'b6'] as [string, string],
      check: ['f9'],
      movable: ['f1', 'a5'],
    };

    it('draws the given position instead of the start position', () => {
      const html = render({ position });
      expect(count(html, /data-piece="/g)).toBe(3);
      expect(html).toMatch(/data-piece="dragon-tail" data-at="a5" data-side="neutral"/);
    });

    it('marks the selected square, move targets, captures, the last move and a King in check', () => {
      const html = render({ position, highlights });
      expect(html).toMatch(/data-selected="f1"/);
      expect(html).toMatch(/data-target="f2"/);
      expect(html).toMatch(/data-target="g2" data-capture=""/);
      expect(html).toMatch(/data-last-move="b8"/);
      expect(html).toMatch(/data-last-move="b6"/);
      expect(html).toMatch(/data-check="f9"/);
    });

    it('draws no marks without highlights', () => {
      const html = render({ position });
      for (const mark of ['data-selected', 'data-target', 'data-last-move', 'data-check']) {
        expect(html).not.toContain(mark);
      }
    });

    it('is clickable only when given a click handler: one hit area per square', () => {
      expect(render({ position })).not.toContain('data-hit');
      const html = render({ position, highlights, onSquareClick: () => {} });
      expect(count(html, /data-hit="/g)).toBe(81);
      // Only squares with something to do are reachable by keyboard: movable pieces and targets.
      expect(count(html, /data-hit="[a-i][1-9]"[^>]*tabindex="0"/g)).toBe(4);
      expect(html).not.toContain('role="img"');
      expect(html).toContain('role="group"');
    });

    it('names a hit area by its square and piece', () => {
      const html = render({ position, onSquareClick: () => {} });
      expect(html).toMatch(/data-hit="f1"[^>]*aria-label="f1, king, light"/);
      expect(html).toMatch(/data-hit="e4"[^>]*aria-label="e4"/);
    });
  });
});
