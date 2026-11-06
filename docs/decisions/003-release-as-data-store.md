# 003: Keep prebuilt data in a GitHub release

**Status:** Implemented, 2026-10-03 (commit `f531c82`).

> **To confirm (Mihir):** nothing in the code or commit history records why a
> release was chosen over the alternatives. Everything under "Alternatives
> considered" is *inferred*. Correct it with what you actually weighed.

## Context

[Decision 002](./002-prebuilt-match-data.md) moved parsing out of the server
and into a GitHub Actions workflow. That workflow produces three files per
match, about 9.5 MB together, for around 20 matches: roughly 170 MB in all.
Those files need to live somewhere that:

- the workflow can write to;
- any server can read from, including one on a different host;
- costs little or nothing for a project of this size;
- needs as little setup and as few secrets as possible.

The data is not private. It is derived from SkillCorner's public open data.

## Decision

Upload the files as assets on a GitHub release tagged `match-data` in this
repository, and have the server download them by URL.

## How it works

- The workflow has `contents: write` permission and uses the token GitHub
  gives every workflow run. It creates the release if it does not exist, then
  uploads with `gh release upload --clobber`.
- The release is created with `--latest=false`, so it is not presented as the
  project's newest software release.
- Assets get stable URLs of the form
  `https://github.com/{owner}/{repo}/releases/download/match-data/{filename}`.
- The server builds that URL from `MATCH_DATA_BASE_URL` plus the file name,
  and downloads with a plain HTTPS request. No credentials.
- Parquet files are uploaded first and metadata last, so a match's metadata
  on the release implies its other files are already there.

Details:
[GitHub Actions and releases](../integrations/github-actions-and-releases.md).

## Consequences

**Better**

- **No new infrastructure.** No bucket, no account, no billing, no keys.
- **No secrets anywhere.** The workflow uses its built-in token to write; the
  server reads anonymously.
- **Data sits next to the code that produced it**, in the same repository,
  visible on its releases page.
- **The source is swappable.** The server only knows a base URL. Pointing
  `MATCH_DATA_BASE_URL` at a bucket or a local file server needs no code
  change.

**Worse**

- **No versions.** `--clobber` replaces a file in place. There is one copy of
  each match, the latest, and no way to ask for "the files as built by
  version N of the ingestion".
- **A release is being used for something it was not designed for.** It works
  because release assets are simply files at stable URLs, but it is a
  convention, not a feature.
- **The data is public.** Fine for open data; it would rule this out for
  anything private.
- **GitHub is a runtime dependency for first loads.** If GitHub is
  unreachable, a match not yet cached on a server cannot be loaded. Matches
  already cached are unaffected.
- **Forks do not get the data.** A fork has no release until its own workflow
  runs, so it must either run it or point `MATCH_DATA_BASE_URL` at the
  original.

## Alternatives considered

### Object storage (S3, R2, GCS)

The conventional home for files like these. It offers versioning, lifecycle
rules, access control and a CDN. Rejected because it needs an account,
billing, and credentials stored as workflow secrets, none of which the
project otherwise has, to hold 170 MB of public files.

### Commit the files to the repository

Simplest to read from. Rejected because 170 MB of binary files that are
rewritten whenever the format changes would grow the repository's history
permanently and slow every clone.

### Git LFS

Keeps large files out of the main history. Rejected because it adds a tool
every contributor must install, has storage and bandwidth quotas, and serving
LFS files to a server at runtime is more awkward than a plain URL.

### Workflow artifacts

The workflow could simply attach its output as an artifact. Rejected because
artifacts expire, and downloading them needs an authenticated API call, so
the server would need a token.

### Bake the files into the Docker image

No runtime download at all. Rejected because the image would grow by 170 MB,
every data change would mean a rebuild and redeploy, and the build would have
to run the 1.3 GB parse or fetch the files from somewhere else anyway.

### Have the server read SkillCorner directly

That is where things started. It requires the server to do the parsing, which
is the problem decision 002 solved.

## Revisit when

- **The data becomes private or per-user.** A public release cannot hold it.
- **Versioning matters.** If the format changes regularly, or old servers
  must keep working during a rollout, the files need versioned names or a
  versioned tag. That is a small change (for example a tag per schema
  version) and would also fix stale server caches.
- **The data outgrows a release.** Many more matches, or much larger files,
  would be better served by object storage with a CDN.
- **Download speed or reliability becomes an issue.**

Because the server only knows a base URL, moving to any of these is a
configuration change plus a new upload step in the workflow.

## In an interview

The short version: the build already runs on GitHub, the files are small and
public, and a release gives stable anonymous download URLs with no extra
accounts or secrets. It is the least infrastructure that does the job. The
known weakness is the lack of versioning, and the design keeps the exit cheap
by hiding the location behind one environment variable.

A good follow-up to have ready is *what would make you move off it*: private
data, a need for versions, or scale.
