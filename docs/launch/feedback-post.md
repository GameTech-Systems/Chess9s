# Pinned feedback post

For the owner to post and pin. GitHub's API doesn't let Claude create a Discussion here, and D91 says the owner posts anyway.

How to post it:

1. Open https://github.com/GameTech-Systems/Chess9s/discussions/new/choose and pick the playtest-feedback category (the Playtest form will appear; replace its fields with the body below, or post from a category that has no form if you prefer).
2. Paste the title and body below.
3. On the finished post, use **Pin discussion** (the pin icon, top right). The footer's Feedback link goes to the playtest-feedback category, so the pinned post is the first thing a visitor sees there.
4. Optional: to link the post itself from the page, paste its URL into `FEEDBACK_URL` in `apps/web/src/links.ts` (a test in `apps/web/src/chrome.test.tsx` checks the current value and needs the same edit).

Wording follows D85: plain words, no ruleset ids or version numbers in the text. It asks for no account beyond GitHub and no email. Posting there is a Contribution under the CLA, as the form says.

---

**Title:** Start here: tell us how Chess Nines plays

**Body:**

Thanks for trying Chess Nines. It's new, and the rules only get better if people play it and say what felt off. This thread is where to start.

**Play:** https://chess9s.com (free, in the browser, no account; on one screen, against the computer, or in an online room by link).

### What we most want to hear

- Did one side feel favored in the 2-player game?
- In the 3-player game, did the Dragon feel too strong, too weak, or about right?
- Which moments felt unclear: a piece's move, a special square, why a game ended?
- Anything that looked broken, on a phone or a computer.

Small things count. "I didn't understand why my pawn was safe there" is useful.

### How to send it

1. **Share a game or a feeling:** start a new post in [playtest-feedback](https://github.com/GameTech-Systems/Chess9s/discussions/categories/playtest-feedback) with the **Playtest** form. It asks which ruleset you played (the name on the rules page is enough) and what you noticed.
2. **Suggest a rule change or a new variant:** use [rule-proposals](https://github.com/GameTech-Systems/Chess9s/discussions/categories/rule-proposals). The builder in the app can export your changes as a link to paste there.
3. **Quick question or short reply:** comment below.

You need a GitHub account to post. If you'd rather not make one, say so in an email to the project address on the privacy page and we'll take it from there.

### What happens next

We read every post. Rule changes never alter a published ruleset; they ship as a new version with the reason written down, and the balance numbers are re-checked before it is called balance-tested.

### Ground rules

Be kind (see the [Code of Conduct](https://github.com/GameTech-Systems/Chess9s/blob/main/CODE_OF_CONDUCT.md)). Please don't post art, story or characters. Anything you post here is a Contribution under the [CLA](https://github.com/GameTech-Systems/Chess9s/blob/main/CLA.md), as the form says.

Thank you for testing.
