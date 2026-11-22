# Breakdown 2 Video Script: The Overlap

*Same run. Different carry. Different result.*

## 1. Brief

| | |
|---|---|
| **Goal** | Show a coach using Tapp'd to compare two overlaps from the same match: one that goes nowhere and one that wins the game. The difference is which way the winger carries the ball |
| **Audience** | Coaches at smaller clubs first; fans and creators second |
| **Length** | ~82s (Act 0 10s, Act 1 22s, Act 2 45s, Act 3 5s). The coach's clip (Act 2) also works alone as a ~45s social cut |
| **Match** | Brisbane Roar 0-1 Perth Glory, A-League 2024/25, match 1925299. Clips: **76:52–77:04** (Brisbane) and **68:13–68:26** (Perth, the goal) |
| **Sound** | None, as in the hero video. The coach "speaks" through speech bubbles (see §5) |
| **Look** | Act 0 reuses the hero's living room and washed-out TV. Tapp'd's full colours arrive with the laptop |

## 2. Core message

- **One line:** "The full-back makes the run. The winger decides where it goes."
- **Story:** On TV, it's a cross and a tap-in → in Tapp'd, the coach finds the same move earlier in the match, by the other team, going nowhere → paused side by side, the only real difference is the winger's carry → at training, the coach shows both to the wingers and full-backs.

## 3. The tactical story

An overlap is a two-man move: the full-back runs around the outside of the winger on the ball. The run gets the attention, but the winger decides what it's worth. Both right-backs here are free by 6–8 m when the ball is played, so the question isn't whether the runner gets free. It's where he is when he gets the ball.

| | 76:56, Brisbane | 68:16, Perth |
|---|---|---|
| **The run** | Hingert (RB), 35 m | Risdon (RB), 53 m |
| **The winger's carry** | Jelacic: 4 m forward, **6 m toward the touchline** | Carluccio: **16 m toward goal**, drifting 3 m infield |
| **Defenders within 5 m when he passes** | 1 (Ngo, 3.5 m) | 2 (O'Shea 2.5 m, Burke-Gilroy 4.3 m) |
| **How free the runner is** | 6.4 m | 7.9 m |
| **Where the runner gets it** | On the touchline, 29 m from the byline | At the corner of the box, 5 m from the byline |
| **Defenders goal-side of the ball** | 5 and the keeper | The keeper only |
| **Team-mates in the box** | 0 | 5 |
| **What happens** | Hingert passes it back 25 m | Cross, goal |

**Why the direction matters:**
- **Carrying at goal** forces defenders to step up to the ball, because otherwise the winger walks in. Two came to Carluccio. That opened the lane in behind them, and Risdon ran through it to the byline.
- **Carrying toward the touchline** threatens no one, so nobody has to step up. Only Ngo went to Jelacic. The carry also drifted toward the lane Hingert was running into, so Hingert ended up on the touchline, in front of the defence, with nobody in the box to cross to.

**To keep in mind (not for the video):** the two moves also start in different places. Brisbane's starts near halfway, and Perth's starts 34 m from goal with runners already going forward. The carry is the difference a coach can teach, not the only one.

## 4. Acts

Times are given within each act (each act starts at 0.0s).

| Act | Name | Time (approx.) |
|---|---|---|
| 0 | On TV: a goal you'd forget | 10s |
| 1 | In Tapp'd: find the two overlaps | 22s |
| 2 | The coach's clip: two moves, side by side | 45s |
| 3 | Close | 5s |

---

## Act 0: On TV (0.0–10.0s)

**Job:** Show the goal the way everyone sees it, a cross and a tap-in, then hint that there's a better question underneath it.

**Set:** The hero's living room at night, seen from behind the couch. The viewer is a coach this time: a whistle on a lanyard and a clipboard sit on the coffee table.

**On the TV:** A broadcast-angle cartoon of the real move, driven by the tracking data (as in `src/match/Broadcast.tsx`). A made-up channel bug and a plain score bar (`BRI 0 – 0 PER`, `68:22`). No league or network branding.

### Shot 0.1: The goal (0.0–3.5s)

- **Action:** The cross floats across the six-yard box, a runner finishes at the back post, and the score bar flips to `BRI 0 – 1 PER`. The viewer barely moves.
- **Caption:** **"A cross. A tap-in. 1-0."** (1.5–3.5s)

### Shot 0.2: The replay (3.5–7.0s)

- **On the TV:** A `REPLAY` tag. The build-up again, the camera staying on the ball: Carluccio carrying, Risdon flashing past him into shot.
- **Caption:** **"Brisbane's right-back made the same run, nine minutes later."** (4.0–7.0s). It's out of order on purpose: the coach has just remembered the other one.

### Shot 0.3: The coach sits up (7.0–10.0s)

- **Action:** The viewer puts the remote down next to the whistle.
- **Caption (on black):** **"So why did only one of them score?"** (8.0–10.0s)

---

## Act 1: In Tapp'd (0.0–22.0s)

**Job:** Show how quickly the coach finds both moves and builds one clip that compares them. Done with the cursor, with the hero's title cards (cream on black, last word in orange).

### Shot 1.0: Open the laptop (0.0–3.0s)

- **Action:** A compressed version of the hero's Act 2. The lid opens on the paused broadcast, which tilts up into the top-down plot. Push in until the app fills the frame.

### Card: "Find the **runs.**" (3.0–4.6s)

### Shot 1.1: Every right-back overlap (4.6–10.0s)

- **Action:**
  1. **Overlays → Event Map.** **Scope: Whole match**, **Show: Runs**. In **More filters**: **Run type: Overlap**, **Player position: RB**. Eight arrows, up both touchlines. Readout: `8 on the pitch`.
  2. The cursor hovers two of them in turn: Risdon's 53 m arrow up the top touchline, and Hingert's 35 m arrow up the bottom one. Each highlights.
- **Caption:** **"8 overlaps by right-backs. 1 goal."** (6.5–10.0s)

### Card: "Put them side by **side.**" (10.0–11.6s)

### Shot 1.2: One clip, two moves (11.6–17.5s)

- **Action:**
  1. **Moments**, filtered **PER**, **Second**, **Goal**: the cursor clicks `68:16 · 9s · Goal` and drags its left end back to `68:13`.
  2. **Create Custom Moment**: `76:52` for `12` seconds. Both moves now sit one after the other in the Moments row.
  3. **Event Map**: **Scope: This clip**, **Show: Runs** and **Carries**. Under **Pick individually**, the cursor keeps four rows: Hingert's run, Jelacic's carry, Risdon's run, Carluccio's carry. Tick **Auto Disappear**.

### Shot 1.3: Mark them up (17.5–20.5s)

A fast montage. Each mark draws on and its bar drops into the timeline.

- **76:56:** **Player Focus** on Hingert. **Link Players**, Jelacic to Ngo.
- **68:16:** **Player Focus** on Risdon. **Link Players**, Carluccio to O'Shea and Carluccio to Burke-Gilroy.
- At each runner's reception: **Draw Rectangle** over the penalty area.

### Shot 1.4: Save it (20.5–22.0s)

- **Action:** **Save Project**. Tick and toast. Fade to black.

---

## Act 2: The coach's clip (0.0–45.0s)

**Job:** The payoff. The coach shows both moves to the squad's wingers and full-backs: Brisbane's first, then the goal, then the two frozen side by side.

**Set (2.0 only):** The club's changing room. The saved clip is on a TV on the wall, a callback to the living room. Players sit on a bench, backs to camera. The coach stands by the screen with the remote. All generic cartoon figures.

**Orientation:** Brisbane attack left to right at 76:56, and Perth attack right to left at 68:16. The video turns the Brisbane clip 180°, so both attack right to left with the overlap on the top touchline. The two moves then read the same way, and the split screen in 2.9 lines up. This is done in the video, not the app.

**Arrow colours:** Both teams' marks use one style: the run in orange, the winger's carry in yellow. Colour then means "the run" and "the carry", not the team.

### Shot 2.0: Training (0.0–3.0s)

- **Action:** The changing-room wide. The coach clicks the remote and the screen wakes. Push into the screen.
- **Caption:** **"Next day. Wingers and full-backs."** (0.3–2.0s)

### Move 1: Brisbane, 76:52

### Shot 2.1: The run (3.0–8.0s) · plays 76:52 → 76:58.4

- **On the plot:** Player Focus on Hingert. His run starts at 76:56 and draws up the touchline.
- **Coach:** *"Brisbane's right-back. Good run, round the outside."*

### Shot 2.2: Pause, the carry (8.0–13.0s) · plays to 77:00.7, then pauses

- **On the plot:** Jelacic's carry draws in yellow: short, and angled toward the touchline. At the pause, one link: Jelacic to Ngo, `3.5 m`. Tag: `1 defender drawn`.
- **Coach:** *"Now watch the winger. He carries it sideways."*, then *"Nobody has to come to him. And he's drifting into the runner's lane."*

### Shot 2.3: Pause, where the runner gets it (13.0–17.5s) · plays to 77:02.7, then pauses

- **On the plot:** Hingert takes it on the touchline. The rectangle over the box reads `0 in the box`. Five Perth defenders and the keeper are lit goal-side of the ball.
- **Coach:** *"He's free. But look where: 29 metres out, on the line, everyone still in front of him."*

### Shot 2.4: Nothing on (17.5–19.5s) · plays to 77:04

- **On the plot:** Hingert passes it back 25 m.
- **Coach:** *"Back it goes."*

### Move 2: Perth, 68:13

### Shot 2.5: Same run (19.5–24.0s) · plays 68:13 → 68:18.0

- **On the plot:** Player Focus on Risdon. His run starts at 68:16 and draws up the same touchline. Carluccio receives at 68:18.
- **Coach:** *"Same run, Perth's right-back. Now watch the winger."*

### Shot 2.6: Pause, the carry (24.0–29.5s) · plays to 68:21.7, then pauses

- **On the plot:** Carluccio's carry draws in yellow: 16 m, straight at goal. At the pause, two links: `2.5 m` (O'Shea) and `4.3 m` (Burke-Gilroy). Tag: `2 defenders drawn`. A ring on Risdon: `7.9 m free`.
- **Coach:** *"Straight at goal. Now two of them have to come to him."*, then *"And the lane behind them is empty."*

### Shot 2.7: Pause, where the runner gets it (29.5–34.0s) · plays to 68:23.3 at 0.5x, then pauses

- **On the plot:** Risdon takes it 5 m from the byline. Only the keeper is goal-side of the ball. The rectangle reads `5 in the box`.
- **Coach:** *"He gets it here. Everyone's beaten but the keeper."*

### Shot 2.8: Goal (34.0–37.5s) · plays to 68:25.3 at 0.5x

- **On the plot:** The cross, and Williams arriving at the back post. 1-0.

### Shot 2.9: Side by side (37.5–45.0s)

- **Action:**
  1. The plot splits into two, Brisbane on the left and Perth on the right, both frozen at the moment the winger passes. Each shows its run (orange) and carry (yellow) as arrows, and its links.
  2. Under each half, three rows build up, one at a time:

     | Brisbane, 76:56 | Perth, 68:16 |
     |---|---|
     | Carry: **toward the touchline** | Carry: **toward goal** |
     | **1** defender drawn | **2** defenders drawn |
     | Runner gets it **29 m** out | Runner gets it **5 m** out |

  3. A card across the bottom: **"The full-back makes the run. The winger decides where it goes."**
- **Coach (last bubble):** *"Wingers: when he's going round you, carry it at goal."*

---

## Act 3: Close (0.0–5.0s)

Reuse the hero's Act 4: the saved project shrinks into a card and replays inside it, with the logo, the headline and the call to action. Either keep **"Turn Match Data Into Tactical Stories."** or use **"Same run. Different result."**, with "Different result." in orange. The CTA stays **"Build your first clip →"**.

---

## 5. Coach voice and callouts

Two kinds of text, which shouldn't look alike:

- **The coach's voice:** a round avatar in the lower-left (the coach from 2.0: cap, whistle) with a white speech bubble and dark text. One bubble at a time, 1–2 short lines. It pops in, holds for at least 1s plus 0.3s per word, then pops out. Lines are spoken and addressed to the squad.
- **Pitch callouts:** small tags pinned to players or lines (`3.5 m`, `7.9 m free`, `2 defenders drawn`, `5 in the box`), in Tapp'd's label style. They state facts. The coach gives the opinions.

**Pausing:** When the coach pauses, a `❚❚` chip appears top-left, the playhead stops on the timeline, and the plot dims slightly except for the players being talked about.

**What is the app, and what is the video:** Moments, Create Custom Moment, Event Map (runs and carries, Pick individually), Player Focus, Link Players, Draw Rectangle and the timeline are real Tapp'd features. The speech bubbles, pause chip, dimming, tags, the 180° turn, the one-style arrow colours and the split screen are added in the video (Remotion).

## 6. Numbers

From `data/events_data_1925299.parquet` and `data/tracking_data_1925299.parquet`. The spacing is measured at the frame the winger's possession ends (the pass) and the frame the runner's possession starts. Match clock in the second half = 45:00 + (frame − 30250) / 10.

| | Brisbane | Perth |
|---|---|---|
| Run event | `1_413`, frame 49410 (76:56.0), 34.7 m, center → wide right | `1_376`, frame 44210 (68:16.0), 52.6 m |
| Winger's possession | `8_859`, Jelacic, 76:58.4–77:00.7, (8.1, −9.5) → (11.8, −15.2) | `8_788`, Carluccio, 68:18.0–68:21.7, (−18.1, 15.9) → (−34.4, 12.8) |
| Carry | 3.7 m forward, 5.7 m toward the touchline (57° off straight) | 16.2 m forward, 3.0 m infield (11° off straight) |
| At the pass | Ngo 3.5 m from the carrier, next 6.9 m. Runner 6.4 m from the nearest defender | O'Shea 2.5 m and Burke-Gilroy 4.3 m from the carrier. Runner 7.9 m from the nearest defender |
| Runner receives | `8_860`, 77:02.7, 29.4 m from the byline, 3.5 m from the touchline. Passes back 25 m | `8_789`, 68:23.3, 5.6 m from the byline, 16.5 m from the touchline |
| Goal-side of the ball | Pennington, Warland, Risdon, Mrčela, Lebib, keeper Cook | Keeper Freke only |
| Team-mates in the box | 0 | 5 |

The other six right-back overlaps (Risdon 0:48 and 37:52, Van Der Saag 54:33, Hingert 85:31, 89:53, 95:23) are summarised in this conversation's analysis. They aren't in the video.

## 7. Open questions

- [ ] **Real names.** The app shows real player names from the open data. The hero video invents everything. Decide whether the coach says names or numbers only.
- [ ] **Side by side.** Is a split screen clearer than two moves in a row? It costs ~7s, but it's the frame people will screenshot.
- [ ] **Headline in Act 3:** the new line, or the shared one.
