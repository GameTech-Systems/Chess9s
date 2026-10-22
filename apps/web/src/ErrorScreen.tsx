import { Component, type ErrorInfo, type ReactNode } from 'react';
import { DISCUSSIONS_URL } from './links';

/** Shown in place of the app when something breaks, so the page is never blank. */
export function ErrorScreen() {
  return (
    <main className="page" role="alert">
      <h1>Something went wrong</h1>
      <p>
        Chess Nines hit an error and could not go on. A game in progress is kept in this browser.
      </p>
      <p>
        <button type="button" className="again" onClick={() => window.location.reload()}>
          Reload
        </button>
      </p>
      <p>
        If it keeps happening, <a href={DISCUSSIONS_URL}>tell us in Discussions</a>.
      </p>
    </main>
  );
}

/** Catches errors thrown while rendering and shows the error screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}
