import { readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { COAST_PIECES } from './brand';
import { CoastPieces } from './CoastPieces';

describe('Coast piece art (D87: raster, WebP at 1x and 2x, no SVG wrapper)', () => {
  it('has five pieces, each with a 1x file and a 2x srcset entry', () => {
    expect(COAST_PIECES.map((p) => p.id)).toEqual([
      'light-dragon-head',
      'sun',
      'dragon-tail',
      'moon',
      'dark-dragon-head',
    ]);
    for (const p of COAST_PIECES) {
      expect(p.src).toMatch(/\.webp$|^data:image\/webp/);
      expect(p.srcSet).toMatch(/ 1x, .+ 2x$/);
      expect(p.src).not.toMatch(/svg/);
    }
  });

  it('renders each piece with srcset and its fixed size', () => {
    const html = renderToStaticMarkup(<CoastPieces />);
    expect(html.match(/<img /g)).toHaveLength(5);
    expect(html.match(/srcSet="|srcset="/g)).toHaveLength(5);
    expect(html).toContain('width="220" height="382"');
  });

  it('keeps the SVG wrappers out of assets/brand/pieces', () => {
    const files = readdirSync(new URL('../../../assets/brand/pieces', import.meta.url));
    expect(files.filter((f) => f.endsWith('.svg'))).toEqual([]);
    expect(files.filter((f) => f.endsWith('.webp'))).toHaveLength(10);
  });
});
