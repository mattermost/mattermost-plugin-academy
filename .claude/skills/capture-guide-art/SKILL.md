---
name: capture-guide-art
description: Capture or refresh the step screenshots for a Mattermost Academy guide using the Playwright harness in capture/. Use when a guide's steps have no images, when replacing hand-drawn SVG art with real captures of the product, when re-capturing after a Mattermost UI change, or when adding a new guide that needs art. Covers local fixture-based captures, licence-gated plugin UI, and --remote captures for licensed products such as Playbooks.
---

# Capturing guide art

The harness in `capture/` seeds a local Mattermost dev server with invented fixtures, drives
Playwright through a declarative shot list, and writes clipped WebP files into
`public/guides/assets/<guideId>/`. This skill is the procedure and the judgment around it.

`capture/README.md` is the reference — shot API, verified selectors, the determinism and declutter
lists, the Chromium repair. Read it rather than restating it. This file is about *what good looks
like*, *what to do in what order*, and *what goes wrong*.

## The standard: show the step, nothing else

This comes from the guides' owner, and it is the bar every shot is judged against: *"whatever we
can do to kind of get rid of the visual noise of things that aren't necessary for the step that
we're teaching about."* A technically correct screenshot of the right screen still fails if the
reader has to hunt for the thing the step names.

1. **Frame the subject, not the screen.** The control the step names, plus only as much around
   it as the reader needs to find it in their own window. A step about the Favorites category is
   the Favorites category — not the team header and Threads above it, which is what the first
   version shipped and the review sent back.
2. **Hide state, crop structure.** Incidental *state* — unread badges, bold unread names, draft
   pencils, "Pinned • Saved" marks, reactions, day dividers, focus rings — is hidden by the
   declutter layer in `capture.js`, on by default. Incidental *structure* — other panes, other
   categories, the posts behind a menu — is never hidden; it is cropped out, with a rectangle
   (`clip`) or with the subject's own outline (`isolate`). Every hidden state is one the reader
   could actually reach (all channels read, nothing pinned). No control is ever removed.
3. **Only real screens.** Never compose, rename or rearrange UI. If a step's screen cannot be
   reached, the step goes without art — see triage.
4. **True size or smaller, never larger, and consistent.** Step art renders at true size (a `2x`
   srcset), left-aligned, in an 840px column capped at 480px tall. Dialogs ship at three-quarter
   size (`scale: MODAL_SCALE`) — at true size a 600px dialog dominates the step, reviewed as
   "rendering too large". The images of one module should share a size: the Search Filters shots
   were 600px wide beside 400px panes and 280–530px tall, and went back as "sizing inconsistency,
   lean to smaller". Below about 0.7x text goes. A full-width centre channel is 1126px at the
   default viewport — use `viewport: NARROW`.
5. **Emphasis only through real states.** Hovering the menu item a step names ("Pin to Channel")
   is fine; it is how the product highlights it. Drawn arrows, rings and callouts are not part of
   the capture.
6. **Fixtures that read like work.** Short, specific, invented messages; enough history to push
   the channel intro out of frame; nothing a reader would stop to read that is not the step.
7. **One theme.** Everything is captured in Denim. Theme-adaptive art was explored and judged not
   worth its cost for now, so do not add theme variants.
8. **Show the action, not its aftermath.** A step that names a control shows the pointer on it,
   label showing (`keep: ['tooltips']`); a step that teaches syntax shows it typed. "Reply in a
   thread" is the Reply button on a hovered message, not the thread it opens; "Quote an exact
   phrase" is the quoted phrase in the search box, not results in which the quotes appear
   nowhere; `ext:` is the modifier being typed with its suggestion. All four went back as wrong.
9. **Frame whole units.** A section with its heading and its buttons, a sidebar that runs on
   behind the menu it opened. Cutting a unit mid-way reads as broken: the keywords shot lost its
   title and half its Save button ("framing is too tight"); the category menu hung past a sidebar
   that stopped at the category's last channel ("cut off sidebar").
10. **Fixtures demonstrate what the step lists.** If the text names four channel types, the
    sidebar has all four; "organize into categories" needs boards in categories; "Text, Divider and
    Checkbox blocks" needs a description built of all three; a gallery needs images to show.
    Seed until the screen says what the sentence says.
11. **The first image of a guide sells the product.** It is the reader's first look at the
    feature, so it shows the feature doing its job — a run with its checklist being worked, not
    the run's header and summary with the checklist starting at the bottom edge.

## Scope and sources of truth

**Pull the latest plugin first.** Guide content moves faster than art: between two capture passes
upstream renamed guides, folded one into another, moved a dozen steps between guides, and changed
step titles. Rebase onto the current default branch, `make deploy`, and read the guide files
before planning shots. Wiring is keyed on step titles, so a stale title silently gets no image.

**The author's list wins.** If the guide owner has marked where images are wanted — placeholders
in the content, or an asset list — that decides which steps get art. Without one, triage below
decides, and the chosen steps are part of the report so the author can adjust them. Never invent
a placeholder convention the author did not ask for.

**Figma.** The guides' first round of art was agreed to be produced in Figma, with an automated
workflow revisited afterwards. These captures slot into either: `--keep-png` writes full-resolution
PNGs to `capture/png/`, which are the base layer for anything drawn on top in Figma.

## Before writing any shots: triage

Most wasted effort in this harness comes from building a shot that could never have worked, or
from concluding too early that one cannot. Check these first.

**Is the step worth a screenshot?** Not every step is. Skip steps that are pure concept ("know
what notifies you by default"), keyboard-only ("learn a handful of shortcuts"), already followed
by a reference table, or already served by another shot's screen. Four adjacent steps showing the
same picture read as padding. Aim for: *does an image teach something the sentence cannot?*

**Can the block even hold an image?** Only `Step` has a `media` field. `ChecklistItem` does not —
`webapp/src/content/types.ts`. A checklist item's title and description look identical to a step's
in the content file, so title-keyed wiring will match it and then fail to typecheck.

**Does the flow exist — or is it gated?** Open the surface and print what it contains before
writing a shot for it:

```js
console.log(await page.evaluate(() => [...document.querySelectorAll('.MuiPopover-paper, [role=menu]')]
    .filter((m) => m.offsetParent).map((m) => m.innerText.trim()).join('\n===\n')));
```

If the step's control is not there, **do not conclude it was removed** until you have checked the
plugin for a gate. Plugins hide licensed UI rather than disabling it. The AI guide's Summarize
Thread, channel summaries and New Messages "Ask AI" all looked absent from Agents on an unlicensed
server, and were reported as replaced by Custom prompts — wrongly. They were in the plugin's
bundle the whole time, behind a check:

```bash
grep -o 'Summarize Thread' ~/Projects/mattermost/server/plugins/<plugin-id>/webapp/dist/main.js
```

A string that exists in the bundle but not on screen is a gate. Read the code around it for the
condition. Agents' is a licence SKU of Entry, Enterprise or Advanced, **or** `EnableTesting` and
`EnableDeveloper` both on — a developer override, which is how a local dev server shows the real
licensed UI. `setup_agents.mjs` turns it on, and `capture.js` refuses to run AI shots without it.

Only when the code is genuinely gone does the step lose its art: say so, and leave the text to the
guide's author. A screenshot of a different feature is worse than the stale drawing it replaces,
because it looks authoritative.

Some gates are drawn as a disabled control instead, with the reason in a tooltip. When a click
times out on a visible button, read it before blaming the selector:

```js
console.log(await btn.evaluate((b) => JSON.stringify({disabled: b.disabled, title: b.title})));
```

**Is the feature on for this server?** Read the client config, not the docs. A flag that is
*absent* is off. Unavailable on an unlicensed server even with the override: `ScheduledPosts`
and `PostAcknowledgements`, which the server sends only with a Professional licence or higher
(`server/config/client.go`). `PostPriority` *is* available, without the acknowledgement toggle.
Those shots come from the licensed test server (below) — the menus they need are reached by typing
into a composer, which writes a draft there, so each such shot has a `teardown` that empties the
composer again.

**Does it need infrastructure the dev server lacks?** Some features need more than a flag:
Summarize Calls needs the Calls plugin and ffmpeg; semantic search needs an embeddings provider
and pgvector in the database (stock `postgres:15` does not ship it). Do not rebuild the user's dev
database to get there — report it.

**Is the guide plugin-gated?** `webapp/src/content/plugins.ts` maps the ids. The plugin must be
installed *and actually start*: Playbooks exits with "this plugin requires a professional license
or higher" on an unlicensed server. Those guides need `--remote` (below).

**Is it an admin-audience guide, or an admin-only screen?** A single shot a fixture user cannot
reach takes `as: 'admin'`, which gives it its own browser session. Verifying a whole admin-audience
guide also needs Academy Test Mode (`useraccessconfig.testMode`, *inside* `useraccessconfig`).

## Local captures

1. **Add fixtures** the shot needs — `capture/seed.js`, or a `fixture_*.js` module for anything
   substantial. Fixtures must be **idempotent and reconciled**: moving a pin, a save or a reaction
   from one message to another has to *un-do* it on the old one, and a fixture added after a
   server was first seeded has to be applied to that server too (see `reconcileBoard`).

   A shot that needs a *service* gets a stub, because a live model writes different prose every
   run. `fixture_ai.js` is the example: check which API the plugin calls (Agents uses the OpenAI
   **Responses** API) and whether the surface wants **structured output**. Both failures look like
   "the model is broken" in the product. `MOCK_DUMP=1` prints request bodies.

2. **Write the shot** in `capture/shots.js`. Prefer role and text locators for anything a user
   clicks; reserve structural selectors for `clip`. Every `setup` that navigates ends with
   `settle(page)`.

3. **Keep shots from contaminating each other.** Anything a shot does that the server remembers
   leaks into later shots:
   - Typing into a composer creates a server-synced **draft**, attachments included. Give each
     composer shot its own channel, and run the Drafts view before any of them.
   - Opening a channel or thread **reads** it. A shot that needs unread state calls
     `ctx.resetUnread()` first, or its retry finds nothing unread.
   - Agents stores conversations in a **bot DM**, which is searchable and reappears in the
     sidebar. The seed clears and hides bot DMs at the start of every run.

4. **Run it alone first**, then the guide, then everything:

   ```bash
   make capture ARGS="--only=<shot-id>,<shot-id> --keep-png"
   make capture ARGS="--guide=<guide-id> --keep-png"
   make capture ARGS=--keep-png
   ```

   On failure, read `capture/failures/<shot>.png` before changing a selector. Shots that pass
   alone can still fail together; order-dependent breakage only shows up in a full run.

## Taking review feedback

The guide owner reviews on the pull request, as comments anchored to each image file plus a list
in the review body. Pull both before changing anything:

```bash
gh pr view <n> --json reviews --jq '.reviews[].body'
gh api --paginate repos/<owner>/<repo>/pulls/<n>/comments --jq '.[] | {path, body}'
```

Map every item to its guide step, sort them into systemic (one fix, many images — corners,
sizing), per-image, removals and new images, and confirm the summary before capturing. A comment
on one image ("black corners") is often true of a whole class; check the class.

## Remote captures, for licensed products

```bash
export MM_REMOTE_URL=https://your-test-server.example.com
export MM_REMOTE_TOKEN=...          # Profile → Security → Personal Access Tokens
make capture ARGS=--remote
```

Mark those shots `source: 'remote'`. **Nothing is seeded in this mode, by construction** — never
call `seed()` from the remote path; it would write fixture users, channels and posts into a
workspace we do not own. Remote runs get a fresh context per shot and one retry; a cloud server
is slow enough that several shots routinely need it.

A remote shot that has to *type* — a composer, to reach the schedule or priority menus — writes a
draft into that server. Give it a `teardown` that empties the composer (which deletes the draft);
the harness runs it after the shot whether or not the shot succeeded, and warns if it fails. Then
check the account has no drafts left. Never *send* anything on a server you do not own.

You cannot tidy a server you do not own, so frame around its data instead. A list that opens on
duplicate test leftovers can be *sorted* — a real action a reader can take — rather than hidden.
Tell the server's owner about the leftovers.

**The token.** Create it in the product (profile → Security → Personal Access Tokens), and keep
it out of the conversation and out of screenshots: copy it from the page to the clipboard, write
the clipboard straight to a private file (`umask 077`), clear the clipboard. You cannot sign in for
the user — ask them to. Revoke the token when the pass is done.

## Framing tools

`clip` options (reference: `capture/README.md`):

| Need | Option |
| --- | --- |
| An element and a portalled menu | array of selectors; `all: true` for sibling submenus |
| Crop at a natural boundary | `bottomOf: '<selector>'`, and `topOf` for the top — the sidebar from a category down to the bottom of its menu |
| Drop a fixed strip off the top | `trimTop: n` — an element whose box starts above where it paints |
| A dialog, or a set that should match | `scale: MODAL_SCALE` or `SEARCH_BOX_SCALE` — ships smaller than true size, still 2x |
| A time that is the subject | `showTimes: true` — `<time>` is hidden by default for determinism |
| One screen in two guides | `copyTo: ['<guide-id>']` — written into both asset folders |
| Several images on one step | map the step to a list of shots in `wire_media.mjs`; each shot's `caption` labels it |
| Undo what setup wrote | `teardown(page, ctx)` — runs after the shot, pass or fail |
| Trim a measured height / width | `maxHeight`, `maxWidth` with `align: 'right'` |
| A pane that grows upward | `anchor: 'bottom'` |
| Nothing but the subject | `isolate: true` — real pixels of the listed elements on the page background |
| A union with no shadow to keep | `pad: 0`, or the default pad leaks the neighbouring column in |
| The centre channel at true size | `viewport: NARROW` on the shot |
| A state that *is* the subject | `keep: [...]` — `unreads`, `drafts`, `postMarks`, `reactions`, `dates`, `browserWarnings`, `prompts`, `tooltips`, `focus` |

`isolate` is the answer to "the menu is fine but the rectangle around it is full of posts". It does
not suit elements that draw outside their own box (the New Messages divider does) — if an
isolated part comes out blank, clip a rectangle instead.

**Rounded corners are cut out automatically.** A dialog, a pane or the composer's frame has
rounded corners, and outside the curve is whatever is behind it — the dark backdrop, the sidebar.
`capture.js` finds the radius of anything whose corner the clip ends on (and, for an isolated
shot, each part's own corners) and makes the outside transparent. It only finds corners the clip
ends *exactly* on: a union's default 8px pad moves the clip off them, so a rounded subject in a
union wants `pad: 0`. Dark wedges in a corner mean the clip missed the corner.

## Review at rendered size

```bash
node capture/contact_sheet.mjs [--per=8] [shot-id ...]   # sheets in capture/png/sheets/
```

This is where quality is decided. Look at every shot of a guide side by side, at the size the
guide renders it, against the standard above: is there anything in frame that is not the step?
Is anything below 0.7x (labelled red)? Do the images of one module share a size? Does a crop cut through a row? Is the draft, the unread
line, the reaction actually the fixture you meant? Iterate until nothing in a sheet makes you look
twice.

## Wiring and verification

```bash
node capture/wire_media.mjs all     # or one guide id; inserts media blocks keyed on step title
make deploy
```

Alt text is imported from `shots.js`, so the capture and the guide cannot drift; re-running
rewrites each mapped step's image block, so a reframed shot's new description reaches the guide.
A guide entry in
`GUIDES` with `scrubSvg: true` also removes that guide's hand-drawn SVG scenes and their files —
for guides whose drawings are being replaced wholesale, where a mix reads worse than either.

Verify **in-product**: every module of every guide, every image loaded, none collapsed, all
left-aligned, no asset 404s, and exactly as many files in the asset tree as the content references.
`tsc`, lint and jest as usual.

## The guards, and why not to weaken them

- **Localhost only** for seeded runs. The output ships inside an Apache-2.0 plugin.
- **`assertNotBlank`** rejects a near-uniform capture — a blank `sidebar-overview.webp` shipped once.
- **`waitForImagesIn`** fails a shot whose frame still holds an unloaded image. Remote avatars
  once came back as broken-image glyphs, in a shot that passed everything else.
- **`assertNoOperatorIdentity`** rejects the machine hostname and, locally, the admin username.
  Channel intros say "created by \<admin\>", and About Mattermost prints the hostname. For an
  isolated shot it checks exactly the regions that ship.

If a guard fires, it is usually right. Fix the shot — seed more history, frame a busier channel,
scroll the subject away from the intro — rather than the guard.

## Common failures

| Symptom | Cause |
| --- | --- |
| Capture is a blank hexagon wash | `#initialPageLoadingScreen` overlays the mounted app; `settle()` waits it out |
| Click times out on a visible element | It is `0×0` until hovered — category "…" buttons need their *header* hovered |
| Click times out on an enabled-looking button | It is `disabled` behind a licence gate — read its tooltip |
| A control the step names is nowhere on screen | Look for it in the plugin bundle before calling it removed — it may be gated |
| Whole app in frame instead of a dialog | `#browseChannelsModal` is a full-viewport wrapper; `.modal-content` is the card |
| Menu missing from a menu shot | Menus are portalled outside the clipped element; add them to the clip |
| Isolated backdrop is black | The backdrop colour came from a transparent element; `pageBackground` reads the theme variable |
| Isolated part is blank white | The element draws outside its own box; clip a rectangle instead |
| Shot differs run to run | An unhidden relative time, drifting presence, or a day divider — pin or declutter it |
| Drafts view shows a draft nobody seeded | An earlier shot typed into a composer; run the Drafts view first |
| Unread line or unread thread missing | An earlier shot (or attempt) read it; call `ctx.resetUnread()` |
| Menu opens upward onto the channel intro | Scroll the anchor to the middle of the list before opening it |
| Board fixture change never appears | Boards rewrites block ids on insert; link to the id in the response |
| Passes alone, fails in a full run | State inherited from an earlier shot |
| `playwright install` leaves a 432KB stub | Its extract step hangs; unpack the intact zip from `$TMPDIR` by hand (README) |
| A wait on rendered text never resolves | The value is in a textarea, not the DOM text — poll `.value` |
| Dark wedges in an image's corners | The clip did not end on the element's rounded corner — `pad: 0` on the union |
| Every board shot after one times out | Boards reopens the last view used; open boards with `ctx.boardURL('<view>')` |
| A person property reads "Empty" | Boards resolves people only among the board's members — add them |
| A clip waits forever on a visible menu | The id is on a zero-height wrapper or on the list inside the paper; clip the painted element |
| "Monday at" with no time | `<time>` is hidden for determinism — `showTimes: true` on that shot |
| Strict-mode error on a remote id | The remote build renders a second copy of the control; scope it, or take `.first()` |
| A keyword chip reads "releasetrain" | The keywords field drops spaces — use single words |
