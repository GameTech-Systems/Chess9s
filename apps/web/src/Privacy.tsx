import { CONTACT_ADDRESS, DISCUSSIONS_URL } from './links';

/** When this page last changed. Update it with any change to what the app does with data. */
export const PRIVACY_UPDATED = '25 October 2026';

/** What Chess Nines does and does not do with a visitor's data. Keep in step with the app. */
export function Privacy() {
  return (
    <article className="prose" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy</h2>
      <p className="meta">Last updated {PRIVACY_UPDATED}</p>
      <ul>
        <li>There are no accounts, no analytics and no cookies.</li>
        <li>Once the page and its own files have loaded, the app makes no network requests.</li>
        <li>
          A guest game lives only in your own browser, in local storage under the key{' '}
          <code>chess9s.guest</code>. It never leaves your device. Clearing your site data deletes
          it.
        </li>
        <li>
          A ruleset you build with Change ruleset is kept the same way, under the key{' '}
          <code>chess9s.rulesets</code>: its name and settings, on your device only. It is never
          sent anywhere, and clearing your site data deletes it. A game played on it also keeps
          those settings with the saved game. Exporting a ruleset saves a file on your device. A
          share link carries the ruleset after a <code>#</code>, which your browser does not send to
          the site. An invitation only opens your own mail app: we never see the address or the
          message.
        </li>
        <li>
          The site is hosted by Cloudflare, which keeps standard request logs (such as IP address,
          time and page requested) under its own policies. We do not receive or use them for
          tracking.
        </li>
        <li>
          Chess Nines collects no personal information from anyone, including children under 13.
        </li>
        <li>
          Because nothing is tracked, the site behaves the same whether or not your browser sends a
          Do Not Track or Global Privacy Control signal.
        </li>
        <li>
          Links to the rules guide and to Suggest a variant open GitHub, whose own privacy statement
          applies there.
        </li>
        <li>
          This page changes only in the public repository, where its history is kept; the date above
          changes with it.
        </li>
      </ul>
      <p>
        Questions:{' '}
        {CONTACT_ADDRESS ? (
          <a href={`mailto:${CONTACT_ADDRESS}`}>{CONTACT_ADDRESS}</a>
        ) : (
          <>
            ask in <a href={DISCUSSIONS_URL}>Discussions</a> (public) until a project email address
            is published here.
          </>
        )}
      </p>
    </article>
  );
}
