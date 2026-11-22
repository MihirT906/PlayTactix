# Tapp'd brainstorm

## What is the problem today?

When a pundit freezes a play and draws the gap behind the left-back, it looks like one person and a touchscreen. Really there's a team behind them: analysts tagging the match, an editor cutting the clip, an operator running the telestrator. That's why the analysis you see is almost always a pundit's.

Everyone else who wants to break down a game, or explain something they saw, has no good way to do it.

## Who are the user segments affected?

Plenty of people read the game just as well as the pundits. They just have no way to show it.

- **Coaches at smaller clubs.** No analyst, no time, and a squad to explain things to.
- **Fans and aspiring analysts.** They spot the same things the pundits do, with nowhere to show it beyond a screenshot or a long post.
- **Content creators.** Already making tactics breakdowns, but by hand.

## What are the possible solutions?

- **Video editors** like CapCut or Adobe. Made for vlogs, not tactics. You can't follow a player. You draw a line, the camera cuts, and the line is now pointing at nothing. Erase it, start again.
- **A whiteboard and a video player.** This is the locker room at most smaller clubs. Pause, rewind, draw on the board, try to match it to the screen, play again. It's a mess.
- **Pro club video suites.** Built and priced for clubs with staff, and you still need the footage.


## What is the best solution?

Computer vision got good enough to track every player from ordinary match video. SkillCorner, Hudl (who now own StatsBomb), Second Spectrum and Metrica Sports are all investing in this. Give them a match and they give back where every player and the ball were, ten times a second. SkillCorner even publishes some matches as free open data.

But what you get back is rows and rows of tabular data. Great if you write Python, useless if you're a coach with 20 minutes before training.

Because that data now exists, Tapp'd doesn't need footage or a team. It works on the data directly:
- You see the whole pitch from above, so there's no camera to cut away, and drawings stay attached to players as they move.
- Overlays like pitch control are computed from player positions, which video alone can't give you.
- No code, no editing skills, no staff.

The other options either can't follow the play (video editors, whiteboard), need a staffed club (pro suites), or need you to code. Tapp'd is the only one that lets one person do the whole thing.

## What success can this bring?

- **Faster feedback for players.** A coach can make a clip of the exact moment and show it at the next session, instead of pausing and rewinding at a whiteboard.
- **Better team strategy conversations.** Coaches and players can talk through the same clip, with the analysis drawn on it.
- **More engagement in the sport.** When fans can break down a game themselves, they watch more closely, share what they saw, and talk about it with other fans.
