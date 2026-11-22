# Breakdown 2: The Overlap, coach cut

*Built on the screen recording. The video pauses it, and a coach at the bottom talks through it.*

| | |
|---|---|
| **Source** | `video/public/overlap-recording.mp4`. 57s, 1844×1124, 60 fps |
| **What's in it** | One 31s clip with two moves. Brisbane 76:52 → 77:07 (clip 0:00–0:15), then Perth 68:13 → 68:29 (clip 0:15–0:31). The Event Map shows each move's run and carry. Player Focus, Voronoi, a drawn arrow and two rectangles are on it, and players are dragged during the pause at 13–29s |
| **Length** | About 2:21: a 3.5s title card, 54s of recording and 83s of holds. Built as the `OverlapCoachCut` composition (`src/breakdowns/overlap/`). Render with `npm run render:overlap-coach` → `out/overlap-coach-cut.mp4` |
| **Sound** | None. The coach speaks in speech bubbles |
| **The point** | The full-back makes the run. The winger decides where it goes |

**Recording time** (`rec`) is the time in the mp4. Match time is shown in the recording's top bar. A **hold** is a freeze frame the video adds. The recording plays on afterwards from the same frame.

---

## The rules

The recording is the only thing on the pitch. The video adds just two things:

1. **The coach's speech bubbles.**
2. **The palm cursor.**

That means no tags, labels, rings, lines, outlines, pulses, chips, cards or dimming on the plot. The title card at the start comes before the recording, so it isn't on the plot. The coach only talks about what the viewer can see: names in the Player Focus labels, shirt numbers, the arrows, the rectangles, the Voronoi patches, the match time and where players are. He doesn't quote distances or other numbers that aren't on screen.

## The cast

- **The coach:** a flat cartoon figure in the hero video's style (cap, whistle, training top), standing in the dark margin at the bottom-left of the frame, left of the pitch. From the waist up, about 300 px tall. He has two poses: idle, and talking (a small bob while a bubble is up). He doesn't point. The palm does that.
- **Speech bubbles:** white, dark text, coming from the coach toward the upper right. One at a time, at most two short lines. Each holds for at least 1s plus 0.3s per word.
- **The palm:** a cartoon open hand in the coach's style, used as a cursor. It glides to whatever the coach is talking about and rests just beside it, so it doesn't cover it. When nothing needs pointing at, it slides off the pitch.

The Brisbane action happens near the bottom touchline, so the coach stays in the left margin, never over the pitch.

The recording's two markings:

- **The orange arrow** (Brisbane, from rec ~13): where Jelacic should have carried it, at goal.
- **The rectangle** ahead of Hingert (Brisbane, from rec ~29): space the defence still controls. That's why Brisbane can't score from there.
- **The rectangle** around Risdon (Perth, at 68:21): Risdon's free space.

---

## Beat 0: Title card (3.5s, before the recording)

**On screen:** The dark navy background from the intro video's Tapp'd card. The Tapp'd logo (mark and wordmark) fades and scales in at the centre. Under it, the tagline rises in: *"Turn a match into a tactical story."* **Tactical story** is in orange.

| Time | What happens |
|---|---|
| 0.0–0.7s | Logo in |
| 0.6–1.2s | Tagline in |
| 1.2–3.0s | Hold |
| 3.0–3.5s | Card fades into the recording's first frame |

No coach, no bubble and no palm yet. The coach appears with the recording.

## Beat 1: Two overlaps (rec 0.0–2.0, then hold)

**On screen:** The empty pitch with the Event Map arrows for both moves. Perth's run and carry are top-left, both pointing at goal. Brisbane's are bottom-centre: the long run to the touchline and the short carry angled down.

**Hold at rec 2.0:**

| Coach | Palm |
|---|---|
| *"Here are traces of two overlaps."* | Off the pitch |
| *"Long arrow: the full-back's run. Short arrow: the winger's carry."* | Perth's long arrow, then the short one |
| *"Perth: carry at goal. Goal."* | Perth's carry arrow |
| *"Brisbane: carry toward the touchline. Nothing."* | Brisbane's carry arrow |
| *"Same run. Different carry."* | Off the pitch |

## Beat 2: Players on (rec 2.0–6.5)

**On screen:** The players appear.

**Edit:** None. The settings panel stays in, to show the app. The macOS screenshot thumbnail in the bottom-right corner (rec 0–2) is covered with a patch. This removes something from the recording rather than adding to the plot.

## Beat 3: Brisbane plays (rec 6.5–13.0)

**On screen:** 76:52 → 76:59. Player Focus switches on for Hingert and Jelacic around rec 11, and their name labels appear.

| rec | Coach | Palm |
|---|---|---|
| ~11.0 | *"Brisbane first. 19, Hingert, is the right-back."* | Hingert |
| ~12.0 | *"23, Jelacic, is the winger."* | Jelacic |

## Beat 4: The carry (rec 13.0–16.5, then hold)

**On screen:** The recording pauses itself at 76:59 with the Voronoi on. Jelacic (23) has the ball. The Event Map's carry arrow points down toward the touchline. The orange arrow from Jelacic points at goal.

| Coach | Palm |
|---|---|
| *"The coloured patches are the space each player controls."* | Sweeps across a few patches |
| *"Jelacic carries it toward the touchline."* | The Event Map carry arrow |
| *"So Hingert has to go even wider round him."* | Hingert |
| *"And 26 can cover both of them."* | White 26 |
| *"This arrow is where he should have gone. At goal."* | The orange arrow |

The hold starts at rec 16.5, the last frame before the dragging begins.

## Beat 5: What if (rec 16.5–28.8, holds at 23.5 and 28.5)

**On screen:** Jelacic is dragged along the orange arrow toward goal. White 2 and white 26 are nudged toward him. Then Hingert is dragged forward into the space, and his Voronoi patch grows.

The coach says "what if" at the start and "back to what happened" at the end, so the viewer knows this part isn't real.

| rec | Coach | Palm |
|---|---|---|
| 16.5 | *"What if he'd carried it there?"* | The orange arrow |
| 17–19.5 | (Jelacic slides along the arrow) | Off the pitch, so it doesn't fight the drag cursor |
| 20–23.5 | *"2 and 26 both have to step up to him."* | White 2, then white 26 |
| **Hold 3s at 23.5** | | |
| 24–28 | *"And look at the space Hingert can run into."* | Hingert's patch |
| **Hold 4s at 28.5** | *"That's the overlap working."* | Off the pitch |

## Beat 6: What happened (rec 28.8–37.0, hold at 32.7)

**On screen:** Playback resumes from the real positions. The rectangle appears ahead of Hingert, with white 2 and white 26 inside it. Hingert receives on the touchline at 77:02, and the Voronoi goes off. He then passes it back.

| rec | Coach | Palm |
|---|---|---|
| 29.5 | *"Back to what happened."* | Off the pitch |
| **Hold at 32.7** | *"Hingert gets it out on the touchline."* | Hingert |
| | *"But this box is still theirs. 2 and 26 are both in it."* | The rectangle |
| ~35.0 | *"Nowhere to go. So it goes back."* | Off the pitch |

## Beat 7: Perth (rec 37.0–45.5)

**On screen:** The clip cuts to 68:13. Player Focus is on Risdon and Carluccio from rec ~41.

| rec | Coach | Palm |
|---|---|---|
| ~38.5 | *"Now Perth. Same move."* | Off the pitch |
| ~42.0 | *"17, Carluccio, has it. 19, Risdon, goes round him."* | Carluccio, then Risdon |

## Beat 8: The carry (hold at rec ~45.7, 68:21)

**On screen:** Carluccio is about to release it. Two Brisbane defenders (21 and 26) are on him. Risdon is alone up the line, with the rectangle around him.

| Coach | Palm |
|---|---|
| *"He carries it straight at goal."* | Carluccio's carry arrow |
| *"21 and 26 both have to come to him."* | Orange 21, then orange 26 |
| *"So nobody's with Risdon."* | Risdon |
| *"Look at this box. It's all his."* | The rectangle |

## Beat 9: Where he gets it (hold at rec ~47.3, 68:23)

**On screen:** Risdon receives at the corner of the box, inside the rectangle.

| Coach | Palm |
|---|---|
| *"Risdon gets it right by the byline."* | Risdon |
| *"Only the keeper's goal-side."* | The keeper (orange 1) |

## Beat 10: Goal (rec 47.3–54.0)

**On screen:** The cross, and the finish at the back post.

| rec | Coach | Palm |
|---|---|---|
| ~49.5 | *"Goal."* | Off the pitch |

**Edit:** End at rec 54.0, before the recording loops back to the start (rec 55).

## Beat 11: The lesson (hold on rec 54.0)

**On screen:** The last frame, unchanged.

| Coach | Palm |
|---|---|
| *"Brisbane carried it wide. One defender covered both."* | Off the pitch |
| *"Perth carried it at goal. Two defenders went to the ball."* | Off the pitch |
| *"The full-back makes the run. The winger decides where it goes."* | Off the pitch |

Fade to black.

---

## Decisions

- **Only bubbles and the palm.** Nothing else is drawn on the plot. The mode chip, pitch callouts, rings, the drawn-arrow pulse, the patch outline and the lesson card are all cut.
- **Names only from labels.** Players without a Player Focus label are called by shirt number.
- **The what-if is a hypothetical.** The Voronoi redraws the space for wherever the players are put. It doesn't predict how anyone else would have moved. The coach's "What if" and "Back to what happened" lines frame it.
- **Jelacic's label.** The app shows `K. Jelacic (LW)` because he's listed as a left winger, but at 76:56 he's on the right. The coach calls him "the winger", and that's enough.
- **No trim.** The settings panel at rec 2–5 stays in.
- **Holds are stills.** Each hold shows a PNG taken from the recording at that moment (`public/overlap-holds/hold-<rec>.png`), because Remotion's `<Freeze>` showed the wrong frame for the later holds. If the recording is replaced, re-extract them.

## Hold times as built

| Hold at rec | Length | Beat |
|---|---|---|
| 1.0 | 14.5s | Two overlaps |
| 16.2 | 18.6s | The carry |
| 23.4 | 3.7s | What if: 2 and 26 step up |
| 28.3 | 3.8s | What if: Hingert's space |
| 32.0 | 8.7s | What happened: the box |
| 47.1 | 13.4s | Perth's carry, Risdon's box |
| 48.7 | 6.3s | Where Risdon gets it |
| 54.2 | 14.0s | The lesson |

Total about 2:21 with the title card. The palm tracks Hingert, Jelacic, Carluccio and Risdon while the recording plays, and parks by the coach between beats.
