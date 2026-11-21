import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorScreen';
import { installErrorFallback, showPlainError } from './errorFallback';
import { appUpdates } from './offline/updates';
import './styles.css';

const root = document.getElementById('root')!;
installErrorFallback(
  window,
  () => root.childElementCount === 0,
  () => showPlainError(root),
);

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Offline play (decision 0025): the service worker keeps the app for hot-seat and computer games
// with no network. Production builds only; `pnpm dev` has no sw.js.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => void appUpdates.start(navigator.serviceWorker, document));
}
