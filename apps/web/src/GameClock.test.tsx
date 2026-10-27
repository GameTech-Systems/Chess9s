// S65: the game screen with a time control (decision 0017): the picker before the first move, a
// clock for each seat, Pause and Resume, Show only, undo off, and the result of running out of
// time. Drawn from models the session functions have driven there; the browser run
// (apps/web/scripts/e2e-3p.mjs, e2e-clock.mjs) plays them by clicking.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Game } from './Game';
import { createRules, listRulesets } from './game/rules';
import { newModel, pauseTimed, playFor, startTimed, tick, type Model } from './game/session';
import { controlById } from './game/timeControls';

const info = (id: string) => listRulesets().find((r) => r.id === id)!;
const control = (id: string) => controlById(id)!;
const render = (initial: Model, id = 'standard-2p') =>
  renderToStaticMarkup(<Game initial={initial} ruleset={info(id)} />);
const model = (id = 'standard-2p') => newModel(createRules(id), info(id));
const S = 1000;

describe('the time control picker', () => {
  it('is offered before the first move, untimed chosen, with only the hot-seat controls', () => {
    const html = render(model());
    expect(html).toContain('aria-label="Time control"');
    expect(html).toMatch(/<option value="untimed" selected="">Untimed<\/option>/);
    expect(html).toContain('<option value="3+2">');
    expect(html).toContain('30 seconds per move');
    expect(html).not.toContain('1 day per move');
    expect(html).not.toContain('away 5 minutes');
    expect(html).not.toContain('Pause');
  });

  it('is offered to 3-player games too, with the chosen control selected', () => {
    const m = startTimed(model('standard-3p'), control('move30s'), false, Date.now());
    const html = render(m, 'standard-3p');
    expect(html).toMatch(/<option value="move30s" selected="">/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Show only/);
  });

  it('has a Show only switch, pressed when it is on', () => {
    const html = render(startTimed(model(), control('3+2'), true, Date.now()));
    expect(html).toMatch(/aria-pressed="true"[^>]*>Show only/);
  });

  it('is gone once a move is played; the control is named instead', () => {
    let m = startTimed(model(), control('3+2'), false, Date.now());
    m = playFor(m, m.game.legal[0]!, Date.now());
    const html = render(m);
    expect(html).not.toContain('aria-label="Time control"');
    expect(html).toContain('Time control: <strong>3+2</strong>');
  });
});

describe('the clocks', () => {
  it('show each seat’s time and the seat to move, in a 2-player game at 3+2', () => {
    const html = render(startTimed(model(), control('3+2'), false, Date.now()));
    expect(html).toContain('aria-label="Clocks"');
    expect(html).toMatch(/data-seat="dark" data-turn="true"/);
    expect(html).toMatch(/data-seat="light" data-turn="false"/);
    expect(html).toMatch(/aria-label="Dark time"[^>]*>3:00</);
    expect(html).toMatch(/aria-label="Light time"[^>]*>3:00</);
  });

  it('show each seat’s time in a 3-player game at 30 seconds per move', () => {
    const html = render(
      startTimed(model('standard-3p'), control('move30s'), false, Date.now()),
      'standard-3p',
    );
    expect(html).toMatch(/aria-label="Dark time"[^>]*>0:30</);
    expect(html).toMatch(/aria-label="Dragon time"[^>]*>0:30</);
  });

  it('are not drawn for an untimed 2-player game; a 3-player one shows time spent as before', () => {
    expect(render(model())).not.toContain('aria-label="Clocks"');
    expect(render(model('standard-3p'), 'standard-3p')).toMatch(
      /aria-label="Dark time"[^>]*>0:00</,
    );
  });

  it('have Pause while running and Resume, with a notice, while paused', () => {
    const running = startTimed(model(), control('3+2'), false, Date.now());
    expect(render(running)).toMatch(/<button[^>]*>Pause<\/button>/);
    const paused = render(pauseTimed(running, Date.now()));
    expect(paused).toMatch(/<button[^>]*>Resume<\/button>/);
    expect(paused).toContain('Paused');
  });

  it('turn undo off', () => {
    let m = startTimed(model(), control('3+2'), false, Date.now());
    m = playFor(m, m.game.legal[0]!, Date.now());
    expect(render(m)).toMatch(/<button[^>]*disabled=""[^>]*>Undo/);
  });

  it('show a seat out of time with Show only, and play on', () => {
    const t = Date.now();
    const m = tick(startTimed(model(), control('1+0'), true, t - 61 * S), t);
    const html = render(m);
    expect(html).toContain('Dark to move');
    expect(html).toMatch(/data-seat="dark"[^>]*data-flag="true"/);
    expect(html).toContain('out of time');
  });
});

describe('the result of running out of time', () => {
  it('is on the status line in a 2-player game', () => {
    const t = Date.now();
    const html = render(tick(startTimed(model(), control('1+0'), false, t - 61 * S), t));
    expect(html).toContain('Out of time · Light wins');
    expect(html).toContain('data-result="win"');
    expect(html).toMatch(/aria-label="Dark time"[^>]*>0:00</);
    expect(html).not.toContain('Pause');
  });

  it('is on the result card in a 3-player game', () => {
    const t = Date.now();
    let m = tick(startTimed(model('standard-3p'), control('move30s'), false, t - 31 * S), t);
    expect(render(m, 'standard-3p')).toContain('Dark ran out of time.');
    m = tick(m, t + 31 * S);
    const html = render(m, 'standard-3p');
    expect(html).toContain('The Dragon wins');
    expect(html).toContain('Light ran out of time.');
  });
});
