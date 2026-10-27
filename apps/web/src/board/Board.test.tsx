import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Board } from './Board';
import { boardData, pieceLetters } from './data';

const render = (props: Partial<Parameters<typeof Board>[0]> = {}) =>
  renderToStaticMarkup(<Board board={boardData} pieceLetters={pieceLetters} {...props} />);
const count = (html: string, needle: RegExp) => (html.match(needle) ?? []).length;

describe('Board', () => {
  it("rings each pawn with its starting file's color, and names the color", () => {
    const html = render();
    const ring = (at: string) =>
      new RegExp(
        `data-piece="pawn" data-at="${at}"[^>]*>[\\s\\S]*?data-pawn-ring="([^"]+)" stroke="(#[0-9a-f]{6})"`,
      ).exec(html);
    expect(ring('b2')?.slice(1)).toEqual(['Red', '#ff000e']);
    expect(ring('b8')?.slice(1)).toEqual(['Pink', '#f440ad']);
    expect(ring('e2')?.slice(1)).toEqual(['Green', '#359b35']);
    expect(html).toMatch(/aria-label="b2, red pawn, light"|<title>b2 · red pawn<\/title>/);
    expect(count(html, /data-pawn-ring="/g)).toBe(14);
  });

  it('keeps the ring of the file a pawn started on after it changes file', () => {
    const html = render({
      position: {
        d3: { piece: 'pawn', side: 'light', home: 'c2', moved: true },
        f1: { piece: 'king', side: 'light', home: 'f1' },
        f9: { piece: 'king', side: 'dark', home: 'f9' },
      },
    });
    expect(html).toMatch(/data-at="d3"[^>]*>[\s\S]*?data-pawn-ring="Orange"/);
  });

  it('draws no ring on the I-file pawns or on other pieces', () => {
    const html = render();
    expect(html).not.toMatch(/data-at="i2"[^>]*>(?:(?!<\/g>)[\s\S])*data-pawn-ring/);
    expect(html).not.toMatch(/data-piece="queen"[^>]*>(?:(?!<\/g>)[\s\S])*data-pawn-ring/);
  });

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

  describe('3-player games (S57)', () => {
    const position = {
      f1: { piece: 'king', side: 'light', home: 'f1' },
      f9: { piece: 'king', side: 'dark', home: 'f9' },
      c4: { piece: 'rook', side: 'dark', stone: true as const },
      g4: { piece: 'dragon-tail', side: 'dragon', stone: true as const },
      h8: { piece: 'sun', side: 'dragon' },
    };

    it('draws a stone as stone: marked and named, whichever side it was', () => {
      const html = render({ position, players: 3 });
      expect(html).toMatch(/data-piece="rook" data-at="c4" data-side="dark" data-stone=""/);
      expect(html).toMatch(
        /data-piece="dragon-tail" data-at="g4" data-side="dragon" data-stone=""/,
      );
      expect(html).not.toMatch(/data-piece="king" data-at="f1"[^>]*data-stone/);
      expect(html).not.toMatch(/data-piece="sun" data-at="h8"[^>]*data-stone/);
      expect(count(html, /data-stone=""/g)).toBe(2);
      expect(html).toContain('<title>c4 · rook, stone</title>');
    });

    it('names a stone in the hit area, and a stone has no moves to offer', () => {
      const html = render({ position, players: 3, onSquareClick: () => {} });
      expect(html).toMatch(/data-hit="c4"[^>]*aria-label="c4, rook, stone"/);
      expect(html).toMatch(/data-hit="h8"[^>]*aria-label="h8, sun, dragon"/);
    });

    it("turns to the Dragon seat: its view is the data's own", () => {
      const html = render({ position, players: 3, seat: 'dragon' });
      expect(html).toContain('Chess Nines board, dragon seat');
      expect(html).toMatch(/data-square="a1"[^>]*data-col="8" data-row="8"/);
    });

    it('marks a King a Dragon piece attacks without check', () => {
      const html = render({
        position,
        players: 3,
        highlights: { targets: [], check: [], movable: [], exposed: ['f1'] },
      });
      expect(html).toMatch(/data-exposed="f1"/);
      expect(render({ position, players: 3 })).not.toContain('data-exposed');
    });
  });
});
