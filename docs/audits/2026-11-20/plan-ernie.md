# Outside reading: the launch plan

Model: Baidu Ernie 5.5 Flash (`baidu/ernie-5.5-flash-preview:free`) through OpenRouter, 20 Nov 2026, S33. It read the first draft of `docs/LAUNCH.md`, decision 0025, the Phase 7 steps and D88 to D94. Kept as it answered, with its headings moved one level down; what was adopted is in SUMMARY.md (row 16 to 18).

## 1. What is strong

- The gate structure is sensible: audit fixes, offline, front door, soft launch, public launch, triage.
- Privacy constraints are a differentiator: no accounts or analytics makes the pitch credible.
- Dragon 3-player, public fairness evidence, and source-available rules give variant players and tinkerers a real reason to care.
- Offline play plus share links reduce friction and make the app feel finished.

## 2. Gaps and risks

- **High — S97 and S29 depend on S98 but are ordered after it.** Post drafts need channel order and contact decisions; testers need owner selection. **Fix:** move S98 before S97 and S29; split S97 into front-door/press work and channel-post work.
- **High — Soft launch is too small and feedback is high-friction.** Five to ten testers may miss 3-player, phone, and accessibility failures; GitHub Discussions requires an account. **Fix:** recruit 12–15 testers with quotas: three 3-player groups, five phone/offline players, one keyboard-only or screen-reader user; add a pinned feedback thread, bug template, and an in-app “Feedback” link.
- **High — Holiday timing can strand the owner.** Today is 20 Nov 2026; a slip pushes launch into December support. **Fix:** set hard dates: soft launch complete by 4 Dec, public launch Tue 8 Dec or Tue 5 Jan; freeze features one week before launch and name a support window.
- **High — The 3-player hook is not the front door.** A first-time visitor may only see 2-player chess. **Fix:** add a hero choice: “Play 2-player” / “Try 3-player Dragon”, a `?mode=dragon` share link, and a one-screen explanation of the third army and win condition.
- **Medium — Audit-before-offline is right, but service-worker risk needs explicit rollback.** **Fix:** in S96, test stale-cache, update-during-game, private browsing, cleared storage, and a recovery path; keep `sw.js` no-cache.
- **Medium — Channel order is mostly right, but Chess Variant Pages needs lead time.** **Fix:** submit the CVP draft 7–10 days before launch; post r/chessvariants first, r/chess second, Show HN after variant communities; skip Product Hunt for launch.
- **Medium — GitHub Discussions moderation is unplanned.** **Fix:** add a code of conduct, issue/discussion templates, labels, a 72-hour triage rule, and recruit two moderator volunteers from testers before S100.
- **Medium — Accessibility is treated as an axe pass.** **Fix:** add manual checks: full keyboard play, screen-reader square/turn announcements, focus trapping in dialogs, visible focus, contrast, reduced motion, 200% zoom.
- **Medium — Mobile testing is too narrow.** **Fix:** test 320/375/430 px, landscape, touch targets ≥44 px, no hover-only controls, safe-area insets, and PWA install on Android and iOS; include one real phone in soft launch.
- **Medium — First-time players will trip on rules, rooms, and offline state.** **Fix:** add first-run coach marks, a concise rules modal, room-link copy feedback, room expiry text, and an offline banner that says what still works.
- **Medium — Success measurement is too infrastructure-only.** **Fix:** add privacy-preserving Worker counters for room creations by mode and 5xx errors; do not add client analytics.

## 3. Changes to the step list

- Reorder to: **S95 → S96 → S98 → S97 → S29 → S99 → S100**. S98 must precede S97 and S29.
- Split **S97**: keep README/press/screenshots; add **S97B — Channel posts and submission checklist** after S98.
- Add **S95A — Accessibility, mobile, and security hardening** before S96, or fold its checks into S95’s done criteria.
- Add **S98A — Community intake and moderation setup** before S29: templates, labels, code of conduct, moderator recruits.
- Add **S97A — CVP and forum pre-submission** 7–10 days before S100.
- Add **S100A — Launch support rota** covering the first 72 hours and holiday blackout dates.
- Remove Product Hunt from Gate 3; move it to a post-launch experiment.

## 4. Success criteria

- **Activation:** ≥40 online rooms created in 28 days, with ≥12 three-player rooms, from Worker counters.
- **Community:** ≥20 Discussions posts/comments and ≥8 issues; 100% triaged within 72 hours.
- **Participation:** ≥5 submitted rulesets, rule proposals, or shared variant links posted in Discussions.
- **Reliability:** <1% 5xx errors and no blocker/high issue open longer than 72 hours.
- **Hook signal:** three-player rooms are ≥25% of online rooms, or ≥10 feedback items explicitly mention Dragon.