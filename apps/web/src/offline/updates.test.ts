import { describe, expect, it, vi } from 'vitest';
import { AppUpdates, type ContainerLike, type RegistrationLike, type WorkerLike } from './updates';

class FakeWorker extends EventTarget implements WorkerLike {
  state = 'installing';
  sent: unknown[] = [];
  postMessage(m: unknown) {
    this.sent.push(m);
  }
  become(state: string) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget implements RegistrationLike {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
  updates = 0;
  async update() {
    this.updates++;
  }
  /** The browser found a new sw.js and starts installing it. */
  found() {
    this.installing = new FakeWorker();
    this.dispatchEvent(new Event('updatefound'));
    return this.installing;
  }
}

class FakeContainer extends EventTarget implements ContainerLike {
  controller: object | null;
  registered: [string, object][] = [];
  constructor(
    public reg = new FakeRegistration(),
    controlled = true,
  ) {
    super();
    this.controller = controlled ? {} : null;
  }
  async register(url: string, opts: object) {
    this.registered.push([url, opts]);
    return this.reg;
  }
}

const setup = (controlled = true) => {
  const container = new FakeContainer(new FakeRegistration(), controlled);
  const reload = vi.fn();
  const doc = new EventTarget() as EventTarget & { visibilityState: string };
  doc.visibilityState = 'visible';
  const updates = new AppUpdates(reload);
  const seen: boolean[] = [];
  updates.subscribe(() => seen.push(updates.getSnapshot()));
  return { container, reg: container.reg, reload, doc, updates, seen };
};

describe('app updates (D90)', () => {
  it('registers /sw.js for the whole site, never from the HTTP cache', async () => {
    const s = setup();
    await s.updates.start(s.container, s.doc);
    expect(s.container.registered).toEqual([['/sw.js', { scope: '/', updateViaCache: 'none' }]]);
    expect(s.updates.getSnapshot()).toBe(false);
  });

  it('does nothing where the browser has no service workers (private browsing)', async () => {
    const s = setup();
    await s.updates.start(undefined, s.doc);
    expect(s.updates.getSnapshot()).toBe(false);
    const failing = { ...s.container, register: () => Promise.reject(new Error('denied')) };
    await expect(s.updates.start(failing as ContainerLike, s.doc)).resolves.toBeUndefined();
  });

  it('a first install is not an update: nothing to offer', async () => {
    const s = setup(false);
    await s.updates.start(s.container, s.doc);
    s.reg.found().become('installed');
    expect(s.updates.getSnapshot()).toBe(false);
  });

  it('a new version that finishes installing is ready, and waits', async () => {
    const s = setup();
    await s.updates.start(s.container, s.doc);
    const next = s.reg.found();
    next.become('installed');
    s.reg.waiting = next;
    expect(s.updates.getSnapshot()).toBe(true);
    expect(s.seen).toEqual([true]);
    expect(next.sent).toEqual([]);
    expect(s.reload).not.toHaveBeenCalled();
  });

  it('a version already waiting from an earlier visit is ready at once', async () => {
    const s = setup();
    s.reg.waiting = new FakeWorker();
    await s.updates.start(s.container, s.doc);
    expect(s.updates.getSnapshot()).toBe(true);
  });

  it('Reload asks the waiting version to take over, then reloads once it has', async () => {
    const s = setup();
    s.reg.waiting = new FakeWorker();
    await s.updates.start(s.container, s.doc);
    s.updates.apply();
    expect(s.reg.waiting.sent).toEqual([{ type: 'skip-waiting' }]);
    expect(s.reload).not.toHaveBeenCalled();
    s.container.dispatchEvent(new Event('controllerchange'));
    s.container.dispatchEvent(new Event('controllerchange'));
    expect(s.reload).toHaveBeenCalledTimes(1);
  });

  it('a take-over the page did not ask for does not reload it (no reload mid-game)', async () => {
    const s = setup();
    await s.updates.start(s.container, s.doc);
    s.container.dispatchEvent(new Event('controllerchange'));
    expect(s.reload).not.toHaveBeenCalled();
  });

  it('checks for a new version when the page is shown again', async () => {
    const s = setup();
    await s.updates.start(s.container, s.doc);
    s.doc.visibilityState = 'hidden';
    s.doc.dispatchEvent(new Event('visibilitychange'));
    expect(s.reg.updates).toBe(0);
    s.doc.visibilityState = 'visible';
    s.doc.dispatchEvent(new Event('visibilitychange'));
    expect(s.reg.updates).toBe(1);
  });
});
