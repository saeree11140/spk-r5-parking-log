# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `docs/openspec/`.

## Conventions

- One task per directory, named by its start date: `docs/openspec/<YYYY-MM-DD>-<feature-slug>/`. In skills, `<feature-slug>` means this whole directory name.
- The spec is `docs/openspec/<YYYY-MM-DD>-<feature-slug>/spec.md`. Near the top it has a `Status:` line, a `Started: YYYY-MM-DD` line, and a `Done: YYYY-MM-DD` line once every issue is done.
- Implementation issues are one file per ticket at `docs/openspec/<YYYY-MM-DD>-<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `docs/openspec/<YYYY-MM-DD>-<feature-slug>/` (creating the directory if needed, dated the day work starts).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `docs/openspec/<YYYY-MM-DD>-<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `docs/openspec/<YYYY-MM-DD>-<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `docs/openspec/<YYYY-MM-DD>-<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
