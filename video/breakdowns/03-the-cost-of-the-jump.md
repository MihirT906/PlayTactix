# Breakdown 3: The cost of the jump

*How one switch beat Wellington's back five*

| | |
|---|---|
| **Match** | Auckland FC 2-1 Wellington Phoenix, A-League 2024/25, Round 7 (7 Dec 2024, match 1899585) |
| **Clip** | 29:49–30:17 on the match clock, about 28 seconds |
| **Outcome** | Sakai, Auckland's right-back, scores at 30:15 |
| **Tool** | **Voronoi** |
| **Also uses** | Team Shape, dragging a player, Pass Probability, Link Players, Draw Arrow, Player Focus, Sequence Trails |
| **Analysis** | Team shape: switching play against a back five |

## The hook

Auckland's right-back scored after a 55 m pass from his own centre-back. The pass was on because, in the ten seconds before it, Wellington's wing-back on the far side had pushed 27 m out of his line to press.

## The idea

A back five covers the width of the pitch. When one wing-back steps up to press, the other four slide across and become a back four, and the far-side wing-back tucks inside. That empties the far touchline. A team that can switch the ball quickly plays straight into it.

## Why this moment

Across the seven matches there are 43 switches of play (completed passes that move the ball 35 m or more across the pitch). Five led to a shot and only this one to a goal. It's also Auckland's longest completed pass of the match.

## The breakdown

Auckland are blue and attack right to left; Wellington are yellow.

1. **29:49–29:59 · The jump.** Auckland work it from their keeper to Pijnaker (4), their left centre-back. Wellington's right wing-back Payne (6) pushes up to press him: 9 m ahead of his back line at 29:49, 27 m ahead at 29:59. Team Shape on the back five stretches from 12 m deep to 29 m, while the four behind Payne stay flat and slide across.
   - Caption: *"Wellington's wing-back jumps. Five at the back becomes four."*
2. **29:59.4 · Four safe passes and one brave one.** Pass Probability shows Pijnaker's options: De Vries, Gallegos, Howieson and Hall at 98–100%, and Sakai on the far touchline at 82%, which takes 6 players out of the game. He picks Sakai.
   - Caption: *"Four safe passes. One that beats six."*
3. **29:59.5 · Why it's on.** Voronoi shows Sakai's space: his cell is about 500 m², more than three times a typical outfield player's. The nearest Wellington player is 16 m away. Sutton (19), the far-side wing-back, has tucked in to make the back four.
   - Caption: *"Sakai has 500 m² to himself."*
4. **What if.** Still paused, drag Sutton about 15 m up towards Sakai. Sakai's cell shrinks to about 310 m², but Sutton is now 25 m from Wootton, his nearest centre-back. With Payne gone, four players can't cover the touchline and the middle.
   - Caption: *"Sutton can cover Sakai or the middle. Not both."*
5. **30:02.6–30:12.6 · The overload.** Sakai receives, plays a one-two with Rogerson (27), then Howieson and Brimmer keep it on the right. Rogerson stays on the touchline, which keeps Sutton wide.
   - Caption: *"Rogerson stays wide. Sutton has to stay with him."*
6. **30:07.5–30:15.3 · The gap.** Wootton drifts inside. Link Players on him and Sutton shows the gap between them grow from 5 m to 20 m. Sakai runs into it, Brimmer finds him with a 56% pass that beats 4, and Sakai scores.
   - Caption: *"A 20-metre gap. The right-back runs into it."*

## The lesson

Pressing with a wing-back is a trade. It works if the press stops the long ball. If it doesn't, the four left behind can't cover the width, and the far-side full-back is free. Wellington's press didn't stop the switch.

## Annotations

| Match clock | Tool | On | What it shows |
|---|---|---|---|
| 29:49.0 → 30:02.6 | Team Shape | Wellington's back five: Sutton 19, Wootton 4, Hughes 15, Sheridan 27, Payne 6 | It stretches from 12 m to 29 m deep as Payne jumps, and its fill fades |
| 29:57.2 → 29:59.5 | Link Players | Payne (yellow 6) and Pijnaker (blue 4) | The press that starts it |
| 29:59.5 → 30:02.6 | Draw Arrow | From Pijnaker to the spot on the top touchline where Sakai receives | The 55 m switch while it's in the air |
| 30:02.6 → 30:15.3 | Player Focus | Sakai (blue 2) | His three times on the ball: the switch, the one-two, the finish |
| 30:07.5 → 30:13.6 | Link Players | Sutton (yellow 19) and Wootton (yellow 4) | The gap he runs into: 5 m to 20 m |

Overlays: **Voronoi** 29:57–30:03, **Pass Probability** 29:58–30:00 and 30:10.5–30:13 (Brimmer's 56% pass), **Sequence Trails** from 29:57 to the end. Sakai's line in Pass Probability only shows from 29:59.3 to 29:59.5, so pause at 29:59.4.

Pause about 3 s at **29:57.2**, at **29:59.4** (do the drag here) and at **30:13.6**.

## Why it shows the value

- **"He should have been wider," measured:** Voronoi and the drag show the trade in numbers: 500 m² for Sakai, or a 25 m hole in the middle.
- **A shape changing live:** Team Shape shows the moment a back five becomes a four, which is when the trade is made.
- **A back-line meeting in one clip:** who covers when the wing-back jumps, and what happens when no one does.

## How to recreate it

1. Open **Auckland FC 2 - 1 Wellington P FC**.
2. In **Moments**, filter Team in possession **AUC**, Half **First**, Led to **Goal**.
   - Click **30:01 · 14s · Goal**: Finish v Low Block, Sakai → Rogerson → Sakai → Howieson → Brimmer → Sakai.
   - Drag its left end back to **29:49**. The tracking only starts at 29:48.4 here, so don't go earlier.
   - Or use **Create Custom Moment** with **29:49** for **28** seconds.
3. Pause at **29:49.0**. Under **Draw**, pick **Team Shape** and click Sutton (19), Wootton (4), Hughes (15), Sheridan (27) and Payne (6). Trim its bar to end at 30:02.6.
4. Pause at **29:57.2** and **Link Players** Payne (yellow 6) and Pijnaker (blue 4). Trim to 29:59.5.
5. Turn on **Voronoi** at 29:57 and off at 30:03. Turn on **Pass Probability** at 29:58 and off at 30:00.
6. Pause at **29:59.4**. With no tool on, drag Sutton up towards Sakai and watch Voronoi update. He snaps back when you play on.
7. At **29:59.5**, **Draw Arrow** from Pijnaker to the spot on the top touchline where Sakai receives. Trim to 30:02.6.
8. At **30:02.6**, add **Player Focus** on Sakai (blue 2), ending at 30:15.3.
9. At **30:07.5**, **Link Players** Sutton and Wootton. Trim to 30:13.6.
10. Turn **Pass Probability** on again at 30:10.5 and off at 30:13, and turn on **Sequence Trails** from 29:57.
11. To record, play at 0.5x and pause about 3 s at 29:57.2, 29:59.4 and 30:13.6. Then **Save Project**.

## Reference: frames and numbers

The first half starts at frame 10. Match clock = (frame − 10) / 10.

| Match clock | Frame | What happens | Numbers |
|---|---|---|---|
| 29:49.0 | 17900 | Auckland build from the back | Payne 9 m ahead of the back four; back five 12 m deep, 31 m wide |
| 29:57.2 | 17982 | Pijnaker receives; Payne presses him | Payne 25 m ahead of the line |
| 29:59.0 | 18000 | Payne at his highest | 27 m ahead; back five 29 m deep, 36 m wide; the four behind him within 2.3 m of a flat line |
| 29:59.3–29:59.5 | 18003–18005 | Pijnaker's options; he plays it | De Vries 98%, Gallegos 98%, Howieson 99%, Hall 100%, Sakai 82% (beats 6) |
| 29:59.5 | 18005 | The switch leaves Pijnaker | 55 m; Sakai's Voronoi cell 504 m² (median outfield cell 155 m²); nearest Wellington player 16 m |
| 29:59.5 | 18005 | What if: Sutton dragged to about x −10, y 24 | Sakai's cell 310 m²; Sutton 25 m from Wootton (really 9.7 m) |
| 30:02.6 | 18036 | Sakai receives | 3.1 s after the pass left |
| 30:05.8 / 30:06.9 | 18068 / 18079 | One-two with Rogerson | |
| 30:07.5 | 18085 | Sutton and Wootton at their closest | 4.8 m apart |
| 30:12.6 | 18136 | Brimmer passes to Sakai | 13 m, 56%, beats 4 |
| 30:13.6 | 18146 | Sakai receives in the box, between Sutton and Wootton | The gap reaches 20 m at 30:14.0 |
| 30:15.3 | 18163 | Sakai scores | |

Switches are completed passes that move the ball 35 m or more across the pitch (sideways), across all seven matches. Voronoi areas and the drag result were computed from tracking positions the same way the overlay draws its cells.
