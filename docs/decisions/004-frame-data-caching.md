# Frame Data Caching — Design Proposal

**Status:** Proposed. Not implemented. Written 2026-08-29.

This document describes how tracking-frame data is cached on the frontend today,
the problems that surface once a clip contains more than one match segment, and a
proposed tiered architecture that addresses them. It is a decision aid, not a
committed plan — see [What to measure first](#what-to-measure-first).

---

## How frame data flows today

1. The user builds a **Clip**: its own timeline `[0, length]` with one or more
   **Segments** placed on it. Each `Segment` maps a clip-frame range to a source
   match-frame range (`clipManager.ts`).
2. During playback `advanceFrame` increments `currentClipFrame`; on every change
   `resolveClipFrame(clip, clipFrame)` translates it to a source match frame.
3. An effect in `App.tsx` calls `dataManager.getFrameData(currentMatchFrame)` and
   `await`s the result, once per frame.
4. `DataManager` (`services/DataManager.ts`) holds a `Map<frame, FrameData>`
   capped at `bufferLimit = 5000`. On a miss it fetches
   `GET /data/frames?match_id&start&end` for `[frame, frame + CHUNK_SIZE]`,
   stores every returned frame, records `missing_frames`, and — when the map
   exceeds the cap — evicts in **insertion order** (`evictOldChunks`).
5. `loadedFrameRange` (a single `{start, end}`) is stored in session state and
   drives the timeline's "missing frames" overlay and event data, both computed
   for one contiguous range and, in `App.tsx`, only for `matchSegments[0]`.

Key property the current design does not exploit: **frame data for a
`(matchId, frame)` pair is immutable.** It never needs revalidation.

---

## Problems

### General

| # | Problem | Effect |
|---|---------|--------|
| G1 | Cache is wiped on every page reload (in-memory only) | Every reload re-downloads everything |
| G2 | Eviction is insertion-order, not usage-order | Frames you are about to reuse get dropped first |
| G3 | Playback path `await`s a fetch per frame | Frame loop is coupled to network latency |
| G4 | `loadedFrameRange` is one interval | Missing-frame overlay / events only ever correct for the last-loaded chunk |
| G5 | Wire format is JSON | `JSON.parse` of large payloads dominates frame cost on a local backend |

### Multi-segment specific

| # | Problem | Effect |
|---|---------|--------|
| M1 | Working set = union of *all* segment source ranges, but the 5000-frame cap and FIFO eviction assume one contiguous region | Once total footage > cap, every clip loop re-fetches every segment |
| M2 | Read-ahead is contiguous in match-frame space | At a segment boundary the next clip frame jumps to a different match frame — cold miss, visible stall at every seam and at the loop point |
| M3 | Missing-frame overlay is hardcoded to `matchSegments[0]` | Segments 2..N never show gap information |
| M4 | `resolveClipFrame` falls back to `matchSegments[0]` for any clip frame not covered by a segment | Scrubbing into a gap silently teleports playback to the first segment's footage |

---

## Proposed architecture

### Principles

- **Immutable data → no revalidation.** Once a frame is cached it is correct
  forever. The only cache-management question is *memory*, never *freshness*.
- **The clip is the prefetch plan.** The set of frames that will be needed is
  known exactly: the union of the current segments' source ranges. Do not infer
  it from the last frame requested.
- **The playback loop never waits.** It asks "do I have this frame?" synchronously
  and renders a buffering state on a miss.

### Block-aligned store

Replace `Map<frame, FrameData>` with a store keyed by fixed-size, aligned
**blocks** (e.g. 512 frames, block index = `frame >> 9`):

```
FrameStore
  ensureRange(matchId, [start, end], priority)   // idempotent; fetches only missing blocks
  get(matchId, frame): FrameData | null          // synchronous; null if not resident
  setWorkingSet(matchId, ranges[])               // declare + pin the clip's footage
```

- Fetches always snap to block boundaries, so overlapping requests dedupe and the
  backend URL is stable (needed for Tier 0 below).
- "What do I have / what is missing" becomes a set of block indices — cheap
  bookkeeping, and naturally represents the disjoint windows a multi-segment clip
  produces (fixes G4, M3).

### Tiers

Data can be resident in more than one place, checked fastest-first:

| Tier | Where | Survives reload? | Holds | How |
|------|-------|------------------|-------|-----|
| 1 | In-memory (`FrameStore`) | No | Decoded blocks (typed arrays) | The frame loop reads only this |
| 2 | IndexedDB | Yes | Decoded blocks, keyed `${matchId}:${blockIndex}` | Hydrate Tier 1 on load before any network call |
| 0 | Browser HTTP cache (optionally a Service Worker) | Yes | Raw response bytes | `Cache-Control: public, max-age=31536000, immutable` on `/data/frames`, with a block-aligned URL |

Request flow for one frame:

```
get(matchId, frame)
  Tier 1 hit?  -> return it (the >99% playback case)
  Tier 2 hit?  -> load block into Tier 1, return
  Tier 0 hit?  -> browser serves bytes with no network -> decode -> store -> return
  otherwise    -> fetch block -> decode -> store in all tiers -> return
```

Minimum viable = Tier 1 + the Tier 0 header. Tier 2 is the upgrade that makes
reloads and revisiting a match instant. A full Service Worker is only worth it
for offline use.

### Prefetch scheduler

A priority queue fed by the clip model, not by playback position alone:

1. **Critical** — block under the playhead ± short lookahead.
2. **Boundary** — first block of `segment[i+1]` when the playhead is within *K*
   frames of `segment[i].clipEnd`; first block of `segment[0]` near the loop
   point. (Fixes M2.)
3. **Working-set fill** — every remaining block in `setWorkingSet`, at idle
   priority, so a full lap eventually has no gaps.

### Eviction

- Blocks intersecting any current segment are **pinned** (via `setWorkingSet`)
  and never evicted.
- Evict only unpinned blocks (footage from deleted segments, scrub excursions),
  least-recently-used. `Map` preserves insertion order, so re-insert on hit for
  LRU. (Fixes G2, M1.)
- Within a single match, if the whole match fits the byte budget, nothing is
  evicted at all — the "cache" is just "the match, resident".
- Across matches: keep the *N* most-recently-used matches, budget by bytes.

### Wire format

Return a block as packed `float32` (frame-major: all entities' `x, y` per frame),
fetched as `arraybuffer`. Parsing becomes a near-free `new Float32Array(buffer)`
instead of `JSON.parse`. Events are sparse — keep them as JSON keyed by frame in a
separate field or endpoint. (Addresses G5.)

### Playback loop

`get()` is synchronous. On `null`, render the last good frame dimmed plus a
buffering indicator and let the scheduler catch up. Combined with the binary
format this also allows updating the Plotly pitch imperatively (via a ref)
instead of through React state on every frame. (Addresses G3.)

---

## What each change solves

| Change | Solves |
|--------|--------|
| `Cache-Control: immutable` + block-aligned URL | G1 (partly), repeated in-session fetches |
| IndexedDB tier | G1 |
| Block-keyed store + block-index missing set | G4, M3 |
| `setWorkingSet` + pinned LRU eviction | G2, M1 |
| Clip-model prefetch scheduler | M2 |
| Synchronous `get()` + buffering fallback | G3 |
| `float32` wire format | G5 |
| Explicit "no footage" result from `resolveClipFrame` | M4 (needs a player/plot empty state — see [segment model](#related-open-questions)) |

---

## What to measure first

The choice between "hold the whole match" and "hold a window" depends on numbers
this repo does not have yet. Before implementing:

1. Full-match size as JSON vs. as packed `float32` (positions only ≈ `frames ×
   entities × 2 × 4` bytes).
2. Cost of one frame advance, split into: network wait, `JSON.parse`, React
   re-render, Plotly redraw.
3. Total frame count for a typical match (frame rate × duration).

If a match is tens of MB and the cost is parse + render, most of the tiering is
unnecessary — load the whole match progressively on select, keep it, and focus on
the binary format and imperative rendering. If a match is hundreds of MB, the
windowed store with pinned working set is required.

---

## Migration path

The `FrameStore` interface (`ensureRange` / `get` / `setWorkingSet`) is the same
whether Tier 1 holds the whole match or a window, and whether Tiers 0/2 exist.
Suggested order, each step independently shippable:

1. Add the `immutable` header + block-align `/data/frames`. No frontend change.
2. Introduce `FrameStore` wrapping the current `Map`, block-keyed, with
   `ensureRange` / synchronous `get`. Move the `App.tsx` per-frame `await` out of
   the playback path.
3. Add `setWorkingSet` + pinned LRU eviction, called whenever the clip changes.
4. Add the prefetch scheduler (boundary + loop-point warming).
5. Switch the wire format to `float32`; update the plot to imperative updates.
6. Add the IndexedDB tier.

Steps 1–3 remove the multi-segment refetch and reload pain. 4–6 are performance
polish.

## Related open questions

- **Segment model.** `resolveClipFrame`'s gap fallback (M4) is only safe to
  change once there is an agreed answer to whether segments must form a
  contiguous, non-overlapping partition of `[0, length]`, or free placement with
  gaps is allowed. That decision also governs `removeSegment` / `setSegmentRange`
  behaviour and annotation drift. Tracked separately.
- **Cross-match clips.** `Segment.matchId` implies footage from multiple matches
  in one clip, but `DataManager` is bound to a single match and the fetch path
  ignores the resolved `matchId`. Either commit (store keyed by `matchId`, which
  the block-keyed design already assumes) or drop the field.

---

## References

- MDN — [HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- web.dev — [Prevent unnecessary network requests with the HTTP Cache](https://web.dev/articles/http-cache)
- Facebook Engineering — [`Cache-Control: immutable`](https://engineering.fb.com/2017/01/26/web/this-browser-tweak-saved-60-of-requests-to-facebook/)
- Jake Archibald — [The Offline Cookbook](https://web.dev/articles/offline-cookbook)
- MDN — [Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) · [`idb-keyval`](https://github.com/jakearchibald/idb-keyval)
- TanStack Query — [Caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching) · [Prefetching](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- MDN — [Media buffering, seeking, and time ranges](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges)
- MDN — [JavaScript typed arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays)
