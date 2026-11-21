/**
 * The page's side of the service worker (decision 0025, D90): register
 * /sw.js, notice when a new version has installed and is waiting, and let it take over only when
 * the page asks (the "Reload for the new version" notice, which the app shows only when no game is
 * in progress). The shapes below are the parts of the browser's API this uses, so tests can fake
 * them.
 */
export interface WorkerLike extends EventTarget {
  state: string;
  postMessage(message: unknown): void;
}
export interface RegistrationLike extends EventTarget {
  installing: WorkerLike | null;
  waiting: WorkerLike | null;
  update(): Promise<unknown>;
}
export interface ContainerLike extends EventTarget {
  controller: object | null;
  register(url: string, options: object): Promise<RegistrationLike>;
}
export interface DocumentLike extends EventTarget {
  visibilityState: string;
}

export class AppUpdates {
  private ready = false;
  private reg: RegistrationLike | null = null;
  private asked = false;
  private listeners = new Set<() => void>();

  constructor(private reload: () => void) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };

  /** True when a new version has installed and waits for the page to reload into it. */
  getSnapshot = () => this.ready;

  private setReady() {
    if (this.ready) return;
    this.ready = true;
    for (const fn of this.listeners) fn();
  }

  /**
   * Registers the worker. Where there is none (some private windows) or registering fails, the
   * app simply runs online, as it did before.
   */
  async start(container: ContainerLike | undefined, doc: DocumentLike): Promise<void> {
    if (!container) return;
    let reg: RegistrationLike | undefined;
    try {
      reg = await container.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    } catch {
      return;
    }
    // A browser that blocks workers may answer with no registration at all.
    if (!reg) return;
    this.reg = reg;
    // A version left waiting by an earlier visit (another tab kept the old one in use).
    if (reg.waiting && container.controller) this.setReady();
    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        // With no controller this is the first install, not an update: nothing to offer.
        if (next.state === 'installed' && container.controller) this.setReady();
      });
    });
    container.addEventListener('controllerchange', () => {
      // Only the take-over this page asked for reloads it; never one in the middle of a game.
      if (!this.asked) return;
      this.asked = false;
      this.reload();
    });
    // Browsers check sw.js on each visit; a page left open checks when it is shown again.
    doc.addEventListener('visibilitychange', () => {
      if (doc.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }

  /** "Reload for the new version": the waiting version takes over, then the page reloads. */
  apply(): void {
    const waiting = this.reg?.waiting;
    if (!waiting) return this.reload();
    this.asked = true;
    waiting.postMessage({ type: 'skip-waiting' });
  }
}

/** The app's one instance; main.tsx starts it in production builds. */
export const appUpdates = new AppUpdates(() => window.location.reload());
