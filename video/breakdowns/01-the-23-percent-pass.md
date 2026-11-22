# Breakdown 1: The 23% pass

*Why one pass from Wellington's centre-back led to a goal at the other end*

| | |
|---|---|
| **Match** | Western Sydney Wanderers 4-1 Wellington Phoenix, A-League 2024/25, Round 9 (22 Dec 2024, match 1927964) |
| **Clip** | 08:53–09:17 on the match clock, about 24 seconds |
| **Outcome** | Western Sydney's second goal: Kraev at 09:14 |
| **Tool** | **Pass Probability** |
| **Also uses** | Moments, Sequence Trails, Player Focus, Link Players, Insights |
| **Analysis** | A decision on the ball: risk against reward |

## The hook

On TV, Western Sydney's second goal looks like a slick counter finished by Kraev. Tapp'd shows it was decided 18 seconds earlier at the other end. Wellington centre-back Hughes had a 94% pass four metres away and chose a 23% one instead.

## The idea

Every pass is a bet, and Pass Probability puts a price on it: the chance it reaches the team-mate. The safe pass keeps the ball. A risky forward pass can take players out of the game. If it's cut out, though, the other team wins the ball already facing your goal.

## Why this moment

Across the seven matches with local data, 485 passes were intercepted and 7 of those led to goals. This is the riskiest of the seven (23%), and it had by far the biggest gap to a safe option (94%).

## The breakdown

Western Sydney are red and attack left to right; Wellington are yellow.

1. **08:55.3 · Hughes wins it.** He steps out of Wellington's back three to press Kraev on the touchline and wins the ball near halfway. He's under low pressure, with the nearest opponent about 7 m away, and has 1 second on the ball.
   - Caption: *"Wellington win it back. Watch the centre-back's choice."*
2. **08:56.0 · The decision.** Pause. Pass Probability shows two options:
   - Sutton, 4 m away: **94%**.
   - Ishige, 20 m away, with Pelekanos about 1 m from him and Brillante close to the passing lane: **23%**.

   He picks Ishige.
   - Caption: *"94% to Sutton. 23% to Ishige. He goes for Ishige."*
3. **08:59.0 · Bonetig intercepts.**
   - Caption: *"Cut out."*
4. **09:02.0 · The same choice, made the other way.** Pause. Clisby can play it back to Bonetig (100%) or forward to Milanovic (70%, which takes 6 Wellington players out of the game). He takes the risk and it pays.
   - Caption: *"Same choice: 100% back, or 70% forward past six."*
5. **09:04.8–09:12.1 · Milanovic carries it 41 m.** Western Sydney's chance of scoring goes from 3% to 21%.
   - Caption: *"41 metres. Chance of scoring: 3% to 21%."*
6. **09:14.1 · Goal.** Borrello lays it off and Kraev scores, 76 m and 15 seconds after the interception. Hughes sprints 68 m back into his box, but can't stop it.
   - Caption: *"15 seconds after the interception."*

## The lesson

Seven seconds apart, both teams make the same forward gamble: 23% to beat 5 players, then 70% to beat 6. The pass to Ishige carried about 20 times the threat of the pass to Sutton, so it wasn't careless. The question for Wellington is when a one-in-four ball is worth it while your back line is near halfway.

## Annotations

| Match clock | Tool | On | What it shows |
|---|---|---|---|
| 08:56.0 → end | Player Focus | Hughes (yellow 15), bottom touchline, just left of halfway | His trail: the pass, then the 68 m run back into his box |
| 08:55.3 → 08:56.3 | Link Players | Ishige (yellow 9) and Pelekanos (red 13) | 1.3 m: the target was marked before the ball left |
| 09:05 → 09:12 | Player Focus | Milanovic (red 14) | The 41 m carry |

Overlays: **Pass Probability** for the whole clip (it shows both decisions), **Sequence Trails** from 08:59.0 (the counter).

Pause about 3 s at **08:56.0** and **09:02.0**. Both pairs of lines only show together at those frames.

## Why it shows the value

- **Faster feedback:** it's a 25-second clip a coach can show one player: "Sutton was 4 m away at 94%."
- **A strategy conversation, not blame:** the two gambles sit side by side, so the talk is about when to take the risk, not who lost the ball.
- **Only possible with tracking data:** no broadcast shows the pass odds, the 1 m marking distance, or the scoring chance rising.

## How to recreate it

1. Open **Western Sydney 4 - 1 Wellington P FC**.
2. In **Moments**, filter Team in possession **WES**, Half **First**, Led to **Goal**.
   - Click the card **08:59 · 15s · Goal**: Transition v Def. Transition, Bonetig → Clisby → Nicolas Milanovic → Borrello → Kraev.
   - Drag the moment's left end back to **08:53**.
   - Or use **Create Custom Moment** with **8:53** for **24** seconds.
3. With the playhead at the start, turn on **Pass Probability** and leave it on for the whole clip.
4. Pause at **08:56.0**, then:
   - **Player Focus** on Hughes (yellow 15). Keep it to the end so his trail shows the run back.
   - **Link Players** on Ishige (yellow 9) and Pelekanos (red 13). Trim its bar to 08:55.3–08:56.3.
5. At **08:59.0**, turn on **Sequence Trails** to trace the counter.
6. Pause at **09:05** and add **Player Focus** on Milanovic (red 14), ending at 09:12.
7. Optionally, in **Insights**:
   - Add a **Pass Option** track with bar height **xPass**. The 94/23 and 100/70 pairs stand out.
   - Add a **Carry** track with bar height **Value added**. Milanovic's +0.19 is the tallest bar.
   - Add the **Momentum** metric.
8. To record, play at 0.5x and pause about 3 s at **08:56.0** and **09:02.0**. Then **Save Project**.

## Optional extension

Hughes's first-time pass at 00:44 also went straight to Borrello, and Sapsford scored 4 seconds later. Adding that moment first makes the clip "two turnovers, two goals, nine minutes." The data lists no passing options for that touch, so it works as context, not the headline.

Breakdown 4 is from the same match and flips this one: there, Western Sydney's safe passes give Wellington a goal.

## Reference: frames and numbers

Match clock = (frame − period start frame) / 10. The first half starts at frame 10 in this match.

| Match clock | Frame | What happens | Numbers |
|---|---|---|---|
| 08:55.3 | 5363 | Hughes wins the ball | Low pressure; nearest opponent about 7 m |
| 08:56.0 | 5370 | Pause on Hughes's options | Sutton 94% (4 m); Ishige 23% (20 m), Pelekanos 1.3 m from him |
| 08:56.3 | 5373 | Hughes plays it towards Ishige | xThreat 0.046 vs Sutton's 0.002; would have bypassed 5 |
| 08:59.0 | 5400 | Bonetig intercepts | |
| 09:02.0 | 5430 | Pause on Clisby's options | Bonetig 100%; Milanovic 70%, bypasses 6 |
| 09:03.4 | 5444 | Clisby plays it to Milanovic | 26 m pass |
| 09:04.8–09:12.1 | 5458–5531 | Milanovic's carry | 41 m; scoring chance 3% → 21% (Value added +0.19) |
| 09:13.5 | 5545 | Borrello lays it off to Kraev | 44% |
| 09:14.1 | 5551 | Kraev scores | 15.1 s and 76 m after the interception; Hughes has run 68 m since his pass |
