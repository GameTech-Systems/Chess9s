import { CONTACT_ADDRESS } from './links';

/** What Chess Nines does and does not do with a visitor's data. Keep in step with the app. */
export function Privacy() {
  return (
    <article className="prose" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy</h2>
      <ul>
        <li>There are no accounts, no analytics and no cookies.</li>
        <li>Once the page and its own files have loaded, the app makes no network requests.</li>
        <li>
          A guest game lives only in your own browser, in local storage under the key{' '}
          <code>chess9s.guest</code>. It never leaves your device. Clearing your site data deletes
          it.
        </li>
        <li>
          The site is hosted by Cloudflare, which keeps standard request logs (such as IP address,
          time and page requested) under its own policies. We do not receive or use them for
          tracking.
        </li>
      </ul>
      <p>
        Questions: <strong>{CONTACT_ADDRESS}</strong>
      </p>
    </article>
  );
}
