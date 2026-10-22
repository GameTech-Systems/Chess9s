import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorScreen';
import { installErrorFallback, showPlainError } from './errorFallback';
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
