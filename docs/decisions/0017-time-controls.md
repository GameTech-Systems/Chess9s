# 0017: Time controls

**Status:** Accepted (owner, ledger D58, 26 Oct 2026: keep the default, and add time controls for players to choose, such as the ones Apex Chess uses). The preset list is Claude's choice, provisional, taken from Apex Chess's `rules/timeControls.json` (its decision D19). What running out of time does is the default D66. S65 built it for hot-seat games and S66 for online rooms (the readings below are provisional).

## Context
The roadmap listed a timer for 3-player games, but no rule defined one (D58). Phase 2 shows each seat's elapsed time, for display only. Online rooms (Phase 5) were planned with no clock (D51), and the project publishes no tournament clock rules (D47).

## Decision
- **Per game, not per ruleset.** A time control is chosen for each game: on the game screen before a hot-seat game (2 or 3 players), and when a room is made online. It is not a rule parameter, so rulesets, locks, fairness runs and the builder don't change. Bot self-play stays untimed.
- **Default: Untimed.** Each seat's elapsed time is shown, for display only, as today (D58's default kept).
- **Data:** `rules/timeControls.json`, with a schema in `rules/schema/` that `validate:rules` checks. The default must be one of its controls.

| Kind | Presets (id) | Where | How it works |
| --- | --- | --- | --- |
| untimed | Untimed (`untimed`, the default) | everywhere | No limit; elapsed time shown |
| fischer | 1+0, 2+1, 3+0, 3+2, 5+0, 5+3, 10+0, 10+5, 15+10, 30+0, 30+20 (minutes + seconds) | everywhere | Each seat starts with the minutes and gains the seconds after each of its own moves |
| perMove | 30 seconds (`move30s`), 1 minute (`move1m`) | everywhere | Each move must be made within the time; unused time is not kept |
| perMove | 1 day (`move1d`), 3 days (`move3d`) | online only | As above, for slow games |
| abandonment | Untimed; away 5 minutes loses (`away5m`) | online only | No clock, but a player who stays disconnected for 5 minutes while the others are connected counts as out of time |

- **Show only.** Any timed control can be played with "Show only" on: running out is shown and play goes on, for players who settle it at the table (D58's option 2).
- **Running clocks.** The clock of the seat to move runs from the start of the game. In 3-player games each seat has its own clock, and a seat that is out stops its clock. Hot-seat games have a Pause button; online clocks keep running while a player is away. A computer seat's thinking time counts on its clock.
- **Undo** is off while a clock is on (it is already off online).
- **Game record.** The record (S46, `v: 1`) carries the time control id, Show only, and each seat's time left after each move, as optional fields, so older records still open.

## Running out of time (D66, default)
Unless Show only is on, a seat whose time runs out is out:
- **2 players:** it loses. If the other player could not checkmate with what it has left (the insufficient-material test applied to that player's pieces alone), it is a draw instead, as in chess.
- **3 players, full rules** ([0016](0016-three-player-rules-v0.3.md)): a Kinged player out of time has its side turned to stone and its turn skipped, as if its King were captured, and the duel begins. The Dragon out of time is out: its pieces turn to stone, and the Kinged players play on (0016 rule 17). In the duel, the player out of time loses.
- **3 players, first checkmate** (Easy Start): the seat out of time is out (its pieces turn to stone and its turn is skipped). The other two play on, and the first checkmate still wins; if only one player is left, that player wins.

The ledger's alternative for D66: a Kinged player out of time loses at once to the other Kinged player, as if checkmated.

## Consequences
- D51's "no clock" becomes "untimed by default": online rooms offer the same controls (S66).
- D47 is unchanged: the project still publishes no tournament clock rules, and an organizer names the time control with the invitation.

## Readings made in S65 (provisional)
Where 0017 left a detail open, S65 chose the following. None changes a rule parameter, ruleset or lock.
- **When the clock starts.** Choosing a control (or starting a new game with the same one) starts the clock of the seat to move at once, as "runs from the start of the game" says. The picker is only offered before the first move; changing the control or Show only restarts the clock.
- **A move after time is up.** A move that arrives after the seat's time ran out counts as the flag fall, not as a move (as at a board). With Show only the move is accepted and the seat gains no increment.
- **Time out draw.** The draw for a player who could not checkmate is judged from that player's pieces alone whatever `draw.insufficientMaterial` is set to, as 0017 words it; a stone never counts.
- **3-player time out** is the same as a resignation (decision 0018) with the reason `timeout`: the same stone-out, the same ends in the duel and in Easy Start.
- **Per-move controls.** Each seat starts its turn with the full time; the record keeps what it had left when it moved.
- **Reload.** The guest game keeps each seat's time left, and comes back paused; leaving the page saves the time the running seat has used. A computer seat's thinking time counts on its clock.
- **Game record.** Optional top-level fields `timeControl` (the id), `showOnly` and `timeLeft` (one entry per move: every seat's milliseconds left after it). A control id this app does not know opens as an untimed game; fields that do not fit the moves refuse the record. A seat out of time in a 3-player game is a resignation entry with `timeout: true`.

## Readings made in S66 (provisional)
Online rooms keep the clocks on the server, with the same functions as hot-seat games. None changes a rule parameter, ruleset or lock.
- **When the clock starts.** A room's clock starts when its last seat is taken (with the computer holding the other seats of a 3-seat room, when the room is made). Until then no seat's time runs.
- **The server's time only.** The room charges each seat by its own time; a browser shows the times the server last sent, running from when they arrived, and can neither set a clock nor drop a flag. A move that arrives after the time ran out is the flag fall, as in S65, and the move is refused.
- **Flag falls with nobody connected.** The room's alarm is set for the running seat's deadline, so the flag falls on time even when no player is connected.
- **Show only** applies to the controls with a clock (Fischer and per move); the abandonment control has no clock to show, so a room refuses Show only with it.
- **Abandonment.** A seat's time away counts while every other person still in the game is connected; when that stops (another person goes away too), the count starts again in full when it resumes. A person alone with the computer's seats is never counted out. A computer seat away while every person is connected is counted like a person.
- **Record.** The room keeps the time control, each seat's time left after each move, and when the running clock started (or when a seat's time away began), with the moves (D53). A seat out of time in a 3-seat room is a resignation entry with `timeout: true`, as in the game record.
