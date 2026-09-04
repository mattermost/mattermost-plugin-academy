---
name: capture-guide-art
description: Capture or refresh the step screenshots for a Mattermost Academy guide using the Playwright harness in capture/. Use when a guide's steps have no images, when replacing hand-drawn SVG art with real captures of the product, when re-capturing after a Mattermost UI change, or when adding a new guide that needs art. Covers local fixture-based captures and --remote captures for licensed products such as Playbooks.
---

# Capturing guide art

The harness in `capture/` seeds a local Mattermost dev server with invented fixtures, drives
Playwright through a declarative shot list, and writes clipped WebP files into
`public/guides/assets/<guideId>/`. This skill is the procedure and the judgment around it.

`capture/README.md` is the reference — shot API, verified selectors, the determinism list, the
Chromium repair. Read it rather than restating it. This file is about *what to do in what order*
and *what goes wrong*.

## Before writing any shots: triage

Most wasted effort in this harness comes from building a shot that could never have worked. Check
these first.

**Is the step worth a screenshot?** Not every step is. Skip steps that are pure concept ("know
what notifies you by default"), keyboard-only ("learn the three shortcuts"), or already served by
another shot's screen. A guide where four adjacent steps show the same picture reads as padding.
Aim for: *does an image teach something the sentence cannot?*

**Can the block even hold an image?** Only `Step` has a `media` field. `ChecklistItem` does not —
`webapp/src/content/types.ts`. A checklist item's title and description look identical to a step's
in the content file, so title-keyed wiring will match it and then fail to typecheck. Check the
block type before promising art for it.

**Does the flow the step describes still exist?** This is the check that saves the most time, and
the easiest to skip. Guide prose ages: a step can name a menu item that a later plugin release
renamed, moved, or replaced. Open the surface and read it before writing a shot for it — the AI
Quick Start guide described *Summarize Thread*, *Find action items* and *Find open questions* on
the post hover toolbar, none of which exist in Agents 2.7.0, where they became user-defined
**Custom prompts**. A quick probe script that opens each menu and prints its items answers this in
one run:

```js
console.log(await page.evaluate(() => [...document.querySelectorAll('.MuiPopover-paper')]
    .filter((m) => m.offsetParent).map((m) => m.innerText.trim()).join('\n===\n')));
```

When the flow is gone, **say so and stop** — do not illustrate the step with the nearest thing you
can reach. A screenshot of a different feature is worse than the stale drawing it replaces, because
it looks authoritative. The step's text needs rewriting first, and that is the guide author's call.
Removing the art and reporting the gap is the correct outcome.

**Is the feature available on this server?** Read the client config, not the docs:

```bash
curl -s -H "Authorization: Bearer $MM_ADMIN_TOKEN" \
  "$MM_SERVICESETTINGS_SITEURL/api/v4/config/client?format=old" | python3 -m json.tool | grep -i <feature>
```

A flag that is *absent* is off. Known unavailable on an unlicensed server: `ScheduledPosts`
(requires `license.IsLicensed`), `PostAcknowledgements`. `PostPriority` *is* available.

Not every gate shows up in the config, though. Some are enforced in the UI as a disabled control,
and the reason is in its tooltip — "Multiple self-service agents require a qualifying Mattermost
plan" is why Agents' *Create agent* button cannot be clicked once one agent exists, admin or not.
When a click times out on a visibly-present button, read `disabled` and hover for the tooltip
before assuming the selector is wrong:

```js
console.log(await btn.evaluate((b) => JSON.stringify({disabled: b.disabled, title: b.title})));
```

**Is the guide plugin-gated?** `webapp/src/content/plugins.ts` maps the ids. The plugin must be
installed *and actually start*: Playbooks exits with "this plugin requires a professional license
or higher" on an unlicensed server, so no version of it runs locally. Those guides need
`--remote` (below).

**Is it an admin-audience guide, or an admin-only screen?** A single shot that a fixture user
cannot reach takes `as: 'admin'`, which gives it its own browser session. Verifying a whole
admin-audience *guide* additionally needs Academy Test Mode:

```bash
# testMode lives *inside* useraccessconfig, not at the top level
# PluginSettings.Plugins["com.mattermost.academy"].useraccessconfig.testMode = true
```

## Local captures

1. **Add fixtures** if the shot needs content that does not exist — `capture/seed.js`, or a
   `fixture_*.js` module for anything substantial (see `fixture_files.js`, `fixture_boards.js`).
   Fixtures must be **idempotent and reconciled**: if a shot's fixture moves from one message to
   another, the seed has to *un-do* it on the old one. Pins, saves and reactions all persist
   server-side, and a stale "Pinned • Saved" banner is exactly the kind of thing that quietly
   ends up in shipped art.

   A shot that needs a *service* rather than content gets a stub, for the same reason: a live
   model writes different prose every run, so a screenshot of one can never be re-captured.
   `fixture_ai.js` is the worked example, and its two hard-won lessons generalise — check which
   API the plugin actually calls (Agents uses the OpenAI **Responses** API, not Chat Completions),
   and check whether the surface wants **structured output** rather than prose. Both failures
   surface as "the model is broken" messages in the product. Dump the request bodies rather than
   guessing.

2. **Write the shot** in `capture/shots.js`. Prefer role and text locators for anything a user
   clicks; reserve structural selectors for `clip`. Every `setup` that navigates must end with
   `settle(page)`.

3. **Run it alone first**, which is much faster than the whole list:

   ```bash
   make capture ARGS=--only=<shot-id>
   make capture ARGS="--only=<shot-id> --keep-png"   # PNGs land in capture/png/ (gitignored)
   ```

   On failure, read `capture/failures/<shot>.png` before changing the selector. It usually shows
   the real problem — a tour dialog, an unbooted app, the wrong tab.

4. **Then run the whole list.** Shots that pass alone can still fail together: the formatting
   shots type into a channel's composer, server-synced drafts keep that text across page loads,
   and a later shot inherits it. Order-dependent breakage only shows up in a full run.

## Remote captures, for licensed products

```bash
export MM_REMOTE_URL=https://your-test-server.example.com
export MM_REMOTE_TOKEN=...          # Profile → Security → Personal Access Tokens
make capture ARGS=--remote
```

Mark those shots `source: 'remote'`. Remote and local sets are mutually exclusive — a fixture
shot cannot find its channels on another server, and a remote shot has nothing to match locally.

**Nothing is seeded in this mode, by construction.** Seeding lives in the local branch of
`capture.js` and is never reached. Do not "fix" that by calling `seed()` from the remote path:
`seed.js` creates users, channels and posts, and pointing it at a shared server writes fixture
clutter into a workspace we do not own.

Remote runs get a fresh browser context per shot and one retry, because reusing a page across a
long remote run degrades — the first five or six shots land and everything after them times out
on content that loaded fine earlier.

## Framing: the part that decides whether the art is any good

`.academy-step__media img` caps rendered height (480px) and scales width to match. **Empty space
at the bottom of a capture costs rendered width.** A full-height sidebar is 264×850 but its
content ends around 550; shipping the whole element rendered it 114px wide, too narrow to read.

- Give tall clips a `maxHeight` **measured** against the content, and cut at a natural boundary
  (a category edge) rather than through one.
- Panes that anchor content to the *bottom* — the thread viewer, the Agents pane — photograph as
  an empty rectangle if you clip from the top, and still pass `assertNotBlank` because the header
  they kept is not blank. Use `anchor: 'bottom'`, which trims the top instead.
- The guide renders into an **840px** column. Aim for a capture whose CSS width is near that.
  Opening a right-hand pane is a legitimate way to narrow an over-wide centre channel: it takes
  the composer from 1142px to 726px, which is the difference between unreadable and readable.
- Open menus are portalled to `<body>`, so they are not inside the element they belong to. Use an
  array `clip` for the union, and `all: true` when a submenu adds a second popover.
- Always look at the result at the size the guide renders it, not at full size. A shot can pass
  every check and still be unreadable in place.

## Wiring and verification

```bash
node capture/wire_media.mjs <guide-id>     # inserts media blocks, keyed on step title
```

Alt text is read out of `shots.js` so the capture and the guide cannot drift. Add the guide's
step-title → shot-id map to `GUIDES` in that file first.

Then:

```bash
make deploy
```

Verify **in-product**, not just that files exist: every image loads, none collapsed, all centred.
Check `tsc` shows only the failures already on `master`, and that jest still passes. Confirm no
asset 404s. An unused `.webp` in the asset tree means a mapping is missing; a missing file means a
mapping is wrong.

Finally, run the capture twice and compare hashes. Runs are visually identical and almost always
byte-identical; the exception is Chromium rasterization occasionally moving **one** pixel by
**1/255**, which is invisible but changes the hash. Do not chase that — the WebP encoder is
deterministic.

## The guards, and why not to weaken them

Three checks in `capture.js` exist because each one caught a real defect that had already shipped
or was about to:

- **Localhost only** for seeded runs. The output goes into an Apache-2.0 plugin.
- **`assertNotBlank`** rejects a near-uniform capture. A shot of the app's boot overlay reports
  success like any other, and a blank `sidebar-overview.webp` shipped that way once.
- **`assertNoOperatorIdentity`** rejects the machine hostname, and on local runs the admin
  username. Channel intros say "created by \<admin\>", join messages say "\<admin\> added you to
  the channel", and About Mattermost prints `Hostname: <your-machine>.local` a few lines under the
  version. All three sit exactly where a shot lands by default.

If a guard fires, it is usually right. Fix the shot — crop tighter, seed more history so the
intro scrolls out of frame — rather than the guard.

## Common failures

| Symptom | Cause |
| --- | --- |
| Capture is a blank hexagon wash | `#initialPageLoadingScreen` overlays the mounted app; `settle()` waits it out |
| Click times out on a visible element | It is `0×0` until hovered — category "…" buttons need their *header* hovered, not the group |
| Whole app in frame instead of a dialog | `#browseChannelsModal` is a full-viewport wrapper; `.modal-content` is the card |
| Menu missing from a menu shot | Menus are MuiPopover, portalled outside the clipped element |
| Sidebar clip 40px short | The notification-permission bar; the context must grant `notifications` |
| Shot differs run to run | An unhidden relative timestamp, or drifting presence — pin it in the seed |
| `playwright install` leaves a 432KB stub | Its extract step hangs; unpack the intact zip from `$TMPDIR` by hand (README) |
| Passes alone, fails in a full run | State inherited from an earlier shot — usually a server-synced draft |
| Pane clip is an empty white rectangle | Its content is bottom-anchored; use `anchor: 'bottom'` |
| Click times out on an enabled-looking button | It is `disabled` behind a licence gate — read its tooltip |
| Menu will not close after a click | Some MUI menus ignore Escape; click a neutral area instead |
| A wait on rendered text never resolves | The value is in a textarea, not the DOM text — poll `.value` |
