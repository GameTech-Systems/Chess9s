// Pages most visits never open load on demand (row 4, S95): the first script carries the game,
// the board and the home page; the builder, the rules and how-to-play pages, privacy and online
// rooms are their own scripts, fetched when first shown (and kept by the offline worker).
import { readFileSync } from 'node:fs';
import { Suspense } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ON_DEMAND, onDemand, preloadPages } from './pages';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const staticImports = (text: string) =>
  [...text.matchAll(/^import [^;]*? from '(\.\/[^']+)';$/gms)].map((m) => m[1]);

describe('pages loaded on demand (row 4, S95)', () => {
  it('the app and the game import none of them directly', () => {
    expect(ON_DEMAND).toEqual([
      'Builder',
      'CreateRoom',
      'HowToPlay',
      'OnlineRoom',
      'Privacy',
      'RulesPage',
    ]);
    for (const file of ['./App.tsx', './Game.tsx', './RulePicker.tsx', './main.tsx']) {
      for (const page of ON_DEMAND)
        expect(staticImports(source(file)), `${file} imports ${page}`).not.toContain(`./${page}`);
    }
    const pages = source('./pages.tsx');
    for (const page of ON_DEMAND) expect(pages).toContain(`import('./${page}')`);
  });

  it('shows the fallback until a page has loaded, then the page itself', async () => {
    let loads = 0;
    const Hello = onDemand(async () => {
      loads += 1;
      return ({ who }: { who: string }) => <p>Hello {who}</p>;
    });
    const page = () =>
      renderToStaticMarkup(
        <Suspense fallback={<p>Loading</p>}>
          <Hello who="dark" />
        </Suspense>,
      );
    expect(page()).toBe('<p>Loading</p>');
    await Hello.preload();
    await Hello.preload();
    expect(page()).toBe('<p>Hello dark</p>');
    expect(loads).toBe(1);
  });

  it('tries a failed load again the next time', async () => {
    let tries = 0;
    const Flaky = onDemand(async () => {
      tries += 1;
      if (tries === 1) throw new Error('offline');
      return () => <p>here</p>;
    });
    await expect(Flaky.preload()).rejects.toThrow('offline');
    await Flaky.preload();
    expect(renderToStaticMarkup(<Flaky />)).toBe('<p>here</p>');
  });

  it('preloads every page (the render tests use it)', async () => {
    await preloadPages();
  });
});
