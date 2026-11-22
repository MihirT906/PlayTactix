# Breakdown 4: Twenty seconds in the corner

*How Wellington's press made a goal out of nothing*

| | |
|---|---|
| **Match** | Western Sydney Wanderers 4-1 Wellington Phoenix, A-League 2024/25, Round 9 (22 Dec 2024, match 1927964) |
| **Clip** | 58:08–58:46 on the match clock, about 38 seconds |
| **Outcome** | Wellington's only goal: Ishige at 58:44 |
| **Tool** | **Insights: Press track**, with the Moments filters to find the press |
| **Also uses** | Moments, Team Shape, Pass Probability, Draw Rectangle, Link Players, Player Focus, Sequence Trails |
| **Analysis** | Out of possession: a high press that traps the build-up on one side |

## The hook

For 70 seconds, Western Sydney tried to play out from the back and never got the ball past halfway. Wellington pinned them in one corner, forced the keeper to go long, and scored 11 seconds after winning it.

## The idea

A high press doesn't need to win a tackle. It needs to take away the short passes until the only one left is a long ball, which is hard to complete. Keep the ball on one side, press every pass, and the touchline does the rest.

## Why this moment

The Moments filters find 32 spells in this match where Western Sydney built up against Wellington's high block. This is the only one that ended in a goal. Across all seven matches, teams won the ball straight after pressing a build-up 58 times. Nine of those led to a shot within 20 seconds, and this is the only goal.

## The breakdown

Western Sydney are red and play out from the right-hand goal; Wellington are yellow. Western Sydney's left side is the bottom of the screen.

1. **58:09–58:17 · Down the left.** Bonetig to Clisby and back. Sheridan presses Clisby twice, and the Press track starts to fill.
   - Caption: *"Western Sydney try to play out. Wellington press every pass."*
2. **58:17.7 · The last way out.** Thomas, the keeper, gets it. Pass Probability shows Pelekanos on the other side at 96%, but only for three tenths of a second. He plays it back down the left to Clisby.
   - Caption: *"The switch is open for 0.3 seconds. Then it's gone."*
3. **58:20–58:30 · The cage.** Clisby, Bonetig, Scicluna, Clisby, Bonetig: five passes in ten seconds, all in the same corner. Payne presses three times, Nagasawa and Barbarouses once each. Team Shape on Wellington's front four shows a line about 25 m wide and under 8 m deep across the corner, with Scicluna stuck inside it. The pressure on each receiver climbs from low to high.
   - Caption: *"Four pressers, one line, one corner."*
4. **58:31.7 · Long ball.** Ishige presses the keeper again and is 3.9 m from him. Pass Probability shows only two options, both long: Borrello 67% and Sapsford 59%. He goes for Borrello.
   - Caption: *"Every short pass is gone. 67% is the best he has."*
5. **58:33.6 · Sheridan intercepts**, about 35 m from goal.
   - Caption: *"Won."*
6. **58:33.6–58:44.4 · The break.** Sheridan, Payne, Sheridan, Payne. Payne's 19 m pass to Ishige is only a 31% ball, but it's the one that adds the most value in the move. Ishige, who pressed the keeper 14 seconds earlier, scores.
   - Caption: *"The presser finishes it."*

## The lesson

Western Sydney weren't careless. Every pass they played in those 20 seconds was 94% or better, until the last one. The trouble was where the safe passes went: each one stayed in the same corner, until the keeper had nothing short left.

## Annotations

| Match clock | Tool | On | What it shows |
|---|---|---|---|
| 58:09.4 → 58:31.7 | Draw Rectangle | Western Sydney's own third, left of centre (bottom right of the screen) | The ball never leaves it |
| 58:11.1 → 58:31.7 | Team Shape | Ishige 9, Barbarouses 7, Nagasawa 25, Payne 6 | The net: about 25 m wide and under 8 m deep by 58:25, with Scicluna (red 5) inside it |
| 58:31.7 → 58:33.6 | Link Players | Ishige and Thomas (red 20) | 3.9 m: the keeper pressed into the long ball |
| 58:33.6 → 58:44.4 | Player Focus | Sheridan (yellow 27) | The interception and his two passes in the break |
| 58:42.6 → end | Player Focus | Ishige (yellow 9) | Presser to scorer |

Overlays: **Pass Probability** 58:17–58:19 and 58:31–58:34 (the keeper's two decisions), **Sequence Trails** from 58:33.6.

Pause about 3 s at **58:17.7**, **58:28.4** and **58:31.7**.

## Why it shows the value

- **"They pressed well," counted:** the Press track shows 9 presses by 5 Wellington players in 20 seconds.
- **Every press in the match, in a few clicks:** the Moments filters list all 32, so you can show the one that worked next to the ones that didn't.
- **The trap closing:** Pass Probability shows safe options at every touch, then a keeper with only long ones.

## How to recreate it

1. Open **Western Sydney 4 - 1 Wellington P FC**.
2. In **Moments**, filter Team in possession **WES**, Attacking phase **Build Up**, Defending phase **High Block**. The heading shows 32 moments.
3. Press **Reset**, then filter Team in possession **WEL**, Half **Second**, Led to **Goal**.
   - Click **58:33 · 11s · Goal**: Quick Break v Def. Quick Break, Sheridan → Payne → Sheridan → Payne → Ishige.
   - Drag its left end back to **58:08**.
   - Or use **Create Custom Moment** with **58:08** for **38** seconds.
4. Pause at **58:09.4** and **Draw Rectangle** over Western Sydney's own third, from the middle of the pitch down to the bottom touchline. Trim it to end at 58:31.7.
5. Pause at **58:11.1**. Under **Draw**, pick **Team Shape** and click Ishige (9), Barbarouses (7), Nagasawa (25) and Payne (6). Trim its bar to end at 58:31.7.
6. Turn **Pass Probability** on at 58:17 and off at 58:19, then on at 58:31 and off at 58:34.
7. Pause at **58:31.7** and **Link Players** Ishige and Thomas (red 20). Trim to 58:33.6.
8. At **58:33.6**, add **Player Focus** on Sheridan (yellow 27), ending at 58:44.4, and turn on **Sequence Trails**.
9. At **58:42.6**, add **Player Focus** on Ishige (yellow 9) to the end.
10. In **Insights**, add a **Press** track for team **WEL**: nine Pressing bars between 58:11 and 58:31. Optionally add a **Pass Option** track with bar height **xPass**: the short options stand tall until the keeper's two long ones at 58:31.7.
11. To record, play at 0.5x and pause about 3 s at 58:17.7, 58:28.4 and 58:31.7. Then **Save Project**.

## Optional extension

Pair it with Breakdown 1, from the same match. There, Wellington's risky pass gave Western Sydney a goal; here, Western Sydney's safe passes give Wellington one.

## Reference: frames and numbers

The second half starts at frame 28390. Match clock = 45:00 + (frame − 28390) / 10.

| Match clock | Frame | What happens | Numbers |
|---|---|---|---|
| 57:23.7–58:33.6 | 35827–36526 | Western Sydney build up against the high block | About 70 s and 23 passes; the ball never crosses halfway and is outside their own third for 0.8 s |
| 58:09.4 | 36284 | Bonetig on the ball | No pressure on him yet |
| 58:11.3 | 36303 | Sheridan presses Clisby | First of 9 Wellington presses by 5 players, to 58:30.6 |
| 58:17.7 | 36367 | Thomas's first touch | Pelekanos 96% (for 0.3 s), Clisby 95%, Brillante 89%, Borrello 55%; he plays Clisby |
| 58:25.2 | 36442 | Scicluna receives inside Wellington's front four | Team Shape 24 m wide, 7.6 m deep; high pressure |
| 58:28.4 | 36474 | Bonetig under high pressure | Clisby 95%, Thomas 94%, Borrello 65% |
| 58:31.7 | 36507 | Thomas's last touch | Ishige 3.9 m away; Team Shape 18 m wide, 7.5 m deep; Borrello 67%, Sapsford 59% |
| 58:33.6 | 36526 | Sheridan intercepts | About 35 m from goal |
| 58:42.6 | 36616 | Payne passes to Ishige | 19 m, 31%, Pass value +0.10 |
| 58:44.4 | 36634 | Ishige scores | 10.8 s after the interception |

- Western Sydney's passes from 58:09.4 to 58:28.4, by xPass of the pass played: 97%, 100%, 99%, 95%, 100%, 96%, 97%, 98%, 94%. Then the keeper's 67%.
- Wellington's presses, 58:11.3–58:30.6: Sheridan 2, Ishige 2, Payne 3, Nagasawa 1, Barbarouses 1.
- Runner-up from another match: Adelaide's press at Brisbane (match 1874553). From 31:52, five Adelaide players press six times in 14 seconds. Ayoubi wins it 42 m from Brisbane's goal line at 32:06, and Mauk scores at 32:14.
