# Guide screenshot capture

Drives a **local** Mattermost dev server with Playwright and writes clipped screenshots into
`public/guides/assets/<guideId>/`.

There is a Claude Code skill for the whole workflow — triage, fixtures, framing, wiring,
verification — at `.claude/skills/capture-guide-art/`. This file stays the reference: shot API,
verified selectors, determinism, and the Chromium repair.

## Why local only

The output ships inside an Apache-2.0 plugin that goes to customers, so no real user, channel, or
message content may end up in a screenshot. `seed.js` creates invented fixtures — Alex Lindman,
Maya Kessler, an "Ops Bridge" channel — and `capture.js` refuses to run against any host other
than localhost. A populated demo server is fine as a *visual reference* for what realistic content
looks like; it is not a capture source.

## Prerequisites

- A local dev server running (`cd ~/Projects/mattermost/server && make run`)
- Plugin uploads enabled, and an admin account
- Node 20.9 or newer (Playwright 1.64 needs 20, sharp 0.35 needs 20.9)

## Run

Authenticate with a **personal access token** rather than a password — revocable, scoped to one
account, and it never has to be typed into a shell. Generate one at
**Profile → Security → Personal Access Tokens** (enable
**System Console → Integrations → Personal Access Tokens** first if the section is missing).

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_TOKEN=paste-token-here

make capture
```

Username and password still work as a fallback:

```bash
export MM_ADMIN_USERNAME=your.username
printf 'Password: '; read -rs MM_ADMIN_PASSWORD; echo; export MM_ADMIN_PASSWORD
```

Reading it with `read -rs` keeps the password out of your shell history.

Do not wrap values in angle brackets. `<` is a redirection operator in zsh and bash, and `$NAME`
inside them expands before the script sees it — the script rejects such values with an explanation
rather than a bare 401.

First run installs Playwright and downloads Chromium (~150MB). After upgrading Playwright, run
`npx playwright install chromium` in `capture/` — `npm install <package>` does not re-run the
postinstall that fetches the browser, and the new version needs its own build.

### If Chromium will not launch

`playwright install` has hung on this machine at the *extraction* step — it downloads the full
archive, then never unpacks it, leaving a ~432KB stub with the Chromium Framework missing. The
launch then dies with `SIGABRT` or `Executable doesn't exist`, which reads like a corrupt download
but is not: the downloaded zip is intact and still sitting in `$TMPDIR`. Unpack it by hand rather
than re-downloading 200MB:

```bash
B=1248    # the build number in the launch error — it changes with the Playwright version
unzip -t $TMPDIR/playwright-download-chromium-mac*-arm64-*.zip   # confirm it is intact
D=~/Library/Caches/ms-playwright/chromium-$B
rm -rf "$D" && mkdir -p "$D"
unzip -q $TMPDIR/playwright-download-chromium-mac*-arm64-*.zip -d "$D"
touch "$D/INSTALLATION_COMPLETE"
```

Headless runs need the *headless shell*, a second package — repeat the above with
`playwright-download-chromium-headless-shell-mac*-arm64-*.zip` into
`chromium_headless_shell-$B`. Both directory names must match the build Playwright expects; it
is printed in the launch error. Playwright 1.64.1 uses build 1248. `PW_CHANNEL=chrome make capture` sidesteps the bundled browser
entirely by driving a locally installed Chrome, at the cost of a floating version.

Useful flags, passed through `ARGS`:

```bash
make capture ARGS=--headed                          # watch the browser drive itself
make capture ARGS=--only=sidebar-favorites,channel-types
make capture ARGS=--guide=productivity-tips         # one guide's shots
make capture ARGS=--keep-png                        # keep full-size PNGs in capture/png/
```

An unknown flag is an error rather than being ignored — `--guide` once ran all fifty shots
because it did not exist yet and nothing said so.

To review what a run produced, build contact sheets of the PNGs at the size the guide renders
them, and read those rather than the full-size files:

```bash
node contact_sheet.mjs [--per=8] [shot-id ...]      # writes capture/png/sheets/
```

## What it does

1. **Seeds** the server over the API — a team, three fixture users, eight channels (one private,
   two the viewer has not joined), a custom sidebar category, three followed threads (one unread),
   a channel with a New Messages line, attachments, reactions, a draft, a DM, and a board.
   Idempotent and reconciled: re-running never duplicates content, which would shift every shot's
   layout, and moving a fixture un-does it where it used to be.
2. **Suppresses onboarding** prompts via user preferences, or tour tooltips cover the UI.
3. **Authenticates the browser** by setting the `MMAUTHTOKEN` cookie from the API login, rather
   than driving the login form.
4. **Runs each shot's `setup`**, then screenshots the element named by `clip` — Playwright clips to
   the bounding box, so crops need no pixel offsets. `clip` may also be an *array* of selectors,
   in which case the shot is the union of their boxes; that is what open menus need, since they
   are portalled outside the element they belong to.
5. **Converts to WebP** at quality 90 (roughly a third of PNG for flat UI).
6. **Writes `shots.lock.json`** recording server version, active plugins, theme, and each shot's
   dimensions. Captures are accurate to exactly one server version; this makes that visible.

On failure it saves a full-page screenshot to `capture/failures/<shot>.png` — usually a moved
selector, and the screenshot shows you what the page actually looked like.

## Determinism

Without these, every re-run diffs and real changes drown in noise:

- animations and transitions disabled; caret hidden
- timestamps and presence dots hidden via CSS (they are not the subject of these shots — if a shot
  needs a visible clock, start the server with `make run-server-faketime` instead)
- fixed viewport, `deviceScaleFactor: 2`, UTC, `en-US`
- `document.fonts.ready` awaited before capturing
- fixture users with fixed names, so avatars and initials are stable
- **notification permission granted** on the context. Otherwise the webapp shows a 40px "We need
  your permission to show notifications" bar, which pushes the app down and makes every sidebar
  clip 40px shorter. It appears headed but not headless, so without this the same shot list
  produces different-sized images depending on `--headed`.
- **landing page pre-dismissed** via the `__landingPageSeen__` / `__landing-preference__`
  localStorage keys the interstitial itself writes. On a fresh profile the first navigation
  otherwise detours through `/landing` for several seconds.
- **the boot overlay waited out.** `#initialPageLoadingScreen` covers the already-mounted app, so
  the sidebar and composer are present and "visible" underneath while screenshots come back as a
  blank hexagon wash. `settle()` in `shots.js` waits for it to go.
- **blank captures rejected.** `assertNotBlank` in `capture.js` fails any shot whose peak channel
  standard deviation is under 4. A shot of the boot overlay is otherwise indistinguishable from a
  successful one, and a blank `sidebar-overview.webp` shipped that way once.
- **unloaded images rejected.** `waitForImagesIn` waits for every `<img>` inside the shipped region
  to load, and fails the shot if one never does — which sends it to its retry. A slow remote server
  once handed back a run-details shot with a broken-image glyph for every participant's avatar,
  and nothing else noticed.

Two runs in the same mode are visually identical, and almost always byte-identical. The
exception is worth knowing before you chase it: Chromium's rasterization is not quite bit-exact
run to run, so a shot occasionally comes back with **one** pixel different by **1/255** on one
channel. That is invisible, but it changes the file hash, so an unrelated re-run can leave a
one-file diff in `git status`. `search-files-tab` is the one that does it most. The WebP encoder
itself is deterministic — re-encoding the same PNG produces identical bytes every time — so
there is nothing to fix on our side.

### Two things time does to a re-run

Both are worth knowing before you conclude a re-capture broke something.

**Date dividers drift.** `ensurePost` reuses posts it already finds, so fixture posts keep the
`create_at` from the day they were first seeded, and a channel captured as "Today" reads
"Wednesday" a few days later. The `dates` declutter category hides day dividers, which ends the
drift. A shot that genuinely needs one can `keep: ['dates']` and accept that it will change.

What is left moves by design: the date picker's "today" marker in `search-date-picker`, and the
weekday on the Remind submenu's "Tomorrow" option in `remind-menu`. Captures run in UTC, so both
change at midnight UTC rather than local midnight.

**Plugins bring their own state.** Anything installed alongside the harness can add to the fixture
world. Agents was the case that taught this: installing it auto-creates a DM with its bot, which
appeared under DIRECT MESSAGES in every sidebar shot, and the Agents pane *stores its conversations
in that DM as ordinary searchable posts* — so each run left another copy of the agent's answer
behind, until the advanced-search shots were mostly agent replies and the Threads view had grown a
thread nobody wrote. `resetBotDirectChannels` in `seed.js` now clears and hides those. The general
lesson: when a re-run changes shots you did not touch, look for state a *plugin* created rather
than for a bug in the shot.

Headless and headed differ more than that: the headless shell and full Chromium rasterize text
differently, so pick one mode for a batch. The default (headless) is the one to prefer;
`--headed` is for watching a shot go wrong.

## Declutter

Guide art should show the step and nothing else. The guides' owner asked for exactly that — to
remove "the visual noise of things that aren't necessary for the step that we're teaching about"
— and the declutter layer in `capture.js` is how the harness does it by default.

The rule is **hide state, crop structure**. Incidental *state* is hidden; every rule leaves a
screen the reader could actually reach. Incidental *structure* is never hidden — it is cropped.

| Category | Hides | Kept by |
| --- | --- | --- |
| `unreads` | Unread badges and bold unread names, in the sidebar and the quick switcher | `unreads-filter` |
| `drafts` | The pencil beside a channel with a draft, and the Drafts count | — |
| `postMarks` | "Pinned • Saved" above a message, and its tint | — |
| `reactions` | Emoji reactions under messages | `emoji-reaction` |
| `dates` | Day dividers (also the drift fix above) | — |
| `browserWarnings` | "Permission required" on desktop notifications — true of headless Chromium, not of a reader | — |
| `prompts` | "Update your status" beside your own name, shown only while no custom status is set | — |
| `tooltips` | Hover labels left behind by whatever setup last clicked or hovered | — |
| `focus` | Focus rings left on whatever setup clicked last | — |

A shot whose subject *is* one of these states keeps it with `keep: ['unreads']`, and a typo there
fails the run rather than silently keeping nothing. `hide: ['<selector>']` hides per-shot state
under the same rule, with `visibility` so nothing the setup already positioned moves.

The stylesheet goes on **before** `setup`, not after. Hiding a banner once a menu is open moves
the message under the menu, and the popover stays where it was anchored.

## Adding a shot

Append to `SHOTS` in `shots.js`:

```js
{
    id: 'unreads-filter',
    guide: 'mattermost-basics',
    module: 'channels-sidebar',
    alt: 'Describe what the image shows, for screen readers',
    clip: '#SidebarContainer',
    async setup(page, {channelURL}) {
        await page.goto(channelURL('ops-bridge'));
        await settle(page);
        await page.locator("[data-testid='sidebar-unread-filter-button']").click();
    },
},
```

Always end `setup` with `settle(page)` after a navigation — see the boot-overlay note under
[Determinism](#determinism) for why `waitForSelector('#channel_view')` is not enough.

Add `as: 'admin'` for a screen a fixture user cannot reach — an admin-only or licence-gated one.
That shot gets its own browser context, built lazily so ordinary runs do not pay for it. The
identity guard is **not** relaxed for those: an admin-only screen is fine to publish, the
operator's account name is not.

Prefer role and text locators for anything a user clicks (`getByRole`, `getByText`) — they survive
refactors. Reserve structural selectors for `clip`. Each one below is verified against the webapp
source, with the file that owns it, so it can be re-checked after an upstream bump:

| Selector | What | Owned by |
| --- | --- | --- |
| `#channel_view` | centre channel area | `channel_layout/channel_controller.tsx` |
| `#SidebarContainer` | the whole LHS sidebar | `sidebar/sidebar.tsx` |
| `#sidebar-left` | the scrollable channel list *only* | `sidebar/sidebar_list/sidebar_list.tsx` |
| `#browseOrAddChannelMenuButton` | the sidebar "+" button | `sidebar/sidebar_header/sidebar_browse_or_add_channel_menu.tsx` |
| `#browseChannelsMenuItem` | its Browse Channels item | same file |
| `#browseChannelsModal .modal-content` | Browse Channels dialog card | `browse_channels/browse_channels.tsx` |
| `.SidebarChannelGroup` | a sidebar category | `sidebar/sidebar_category/sidebar_category.tsx` |
| `.SidebarMenu_menuButton` | a category's "…" menu trigger | same file |
| `[data-testid='sidebar-unread-filter-button']` | unreads filter toggle | `sidebar/channel_filter/channel_filter.tsx` |

### Framing matters more than it looks

`.academy-step__media img` in `webapp/src/components/app.scss` caps rendered height and scales
width to match, so **empty space at the bottom of a capture costs rendered width**. A full-height
sidebar clip is 264×850 CSS px but its content ends around 550; shipping the whole element rendered
it 114px wide, too narrow to read the channel names. Give `clip` a `maxHeight` to trim to the
content's own extent:

```js
clip: {of: '#SidebarContainer', maxHeight: 450},
clip: {of: ['#SidebarContainer', '.MuiPopover-paper'], maxHeight: 400},
clip: {of: '#sidebar-right', maxHeight: 500, anchor: 'bottom'},
```

Measure before picking a number — crop to a category boundary rather than through one. Better
still, crop *at* an element with `bottomOf`, which survives a category gaining a row:

```js
clip: {of: '#SidebarContainer', bottomOf: `.${CLIP_TARGET}`},    // down to the end of Favorites
```

`anchor: 'bottom'` keeps the bottom of the element and trims the top. Panes that grow **upwards**
from an input — the Agents pane, the thread viewer — put all their content at the bottom of a
full-height column, so a default top-anchored crop of one photographs empty white and still passes
`assertNotBlank`, because the header it kept is not blank. Two Agents shots shipped that way
before this existed.

**Step art renders at true size.** Captures are 2x density, and `module_blocks.tsx` gives each
raster step image a `2x` srcset. Before that, the browser treated every pixel as a CSS pixel, so a
600px dialog displayed at 1200px until the column stopped it, and a small menu came out at 2.6x —
the same screenshots rendered at wildly different magnifications. Now a shot renders at the size
the product draws it, shrunk only when the column (840px) or the height cap (480px) requires.

That makes width the thing to watch. The centre channel is 1126px at the default 1440px viewport,
so a composer or a message row lands at 0.75x — too small to read. Two fixes:

- `viewport: NARROW` on the shot (1180px, still the desktop layout): the centre channel becomes
  about 860px and lands at true size.
- `maxWidth` (with `align: 'right'` to keep the right end): a message row whose text uses the left
  400px of 1126 needs only those 400.

Below about 0.7x, text starts to go; `contact_sheet.mjs` labels those tiles red.

**Smaller on purpose: `scale`.** True size is the ceiling, not the target. A 600px dialog at true
size fills most of the 840px column and outweighs the step it illustrates — the guides' author
reviewed the dialogs as "rendering too large". `scale: MODAL_SCALE` (0.75) shrinks the finished
capture before it is written; the file stays 2x density, so it is still sharp and the renderer needs
nothing new. The search box is a fixed 600px at every window size and cannot be cropped narrower,
so its shots use `SEARCH_BOX_SCALE` to sit near the 400px results-pane shots beside them, and the
Search Filters four share one height, `SEARCH_FILTER_HEIGHT`. Images in one module should look
like a set.

**Rounded corners come out transparent.** Outside a dialog's or a pane's rounded corner is
whatever is behind it — the dark modal backdrop, the sidebar, the global header — and the first
pass shipped those as dark wedges in every corner ("black corners", in review). `cornerRadii`
finds the radius of any element whose corner the clip ends exactly on, walking up from whatever is
painted just inside the corner because the radius is often an ancestor's; `maskCorners` makes the
outside of the curve transparent, cut a pixel inside the element's own edge so its anti-aliased
dark rim goes too. An isolated shot masks each part's corners as well. A union's default pad moves
the clip off the corners, so a rounded subject in a union needs `pad: 0`.

**`topOf` and `bottomOf`** crop at elements' edges, so a tall element can be framed between two
of its parts: the sidebar from the Projects category down to the bottom of that category's menu,
running on behind the menu rather than stopping at the category's last channel. `trimTop: n`
drops a fixed strip, for a box that starts above where it paints.

**`isolate: true`** crops to the subject's outline instead of a rectangle. A rectangle around a
menu and the thing it opened from always contains whatever the app drew between them — posts
behind a category menu, file cards behind the composer's AI menu. With `isolate`, every pixel of
every element in `clip` is the real screenshot and everything else is the page background; nothing
inside the subject changes. It does not suit an element that draws outside its own box — the New
Messages divider does, and isolating it kept blank white — so check the result.

**`pad: 0`** turns off the 8px a union adds to keep menu shadows. For a union of two sidebar
categories that pad is a strip of the channel next to the sidebar.

### Traps

Four of these, each of which produced a wrong-but-passing shot at some point:

- **`#sidebar-left` is not the sidebar.** It is the channel list. The team header, the "+" button
  and the unreads filter live in `#lhsNavigator`, a sibling. A shot that needs those must clip
  `#SidebarContainer`.
- **`#browseChannelsModal` is not the dialog.** It is the full-viewport wrapper, so clipping it
  yields a 1440×900 screenshot of the entire app. `.modal-content` is the card.
- **Menus are portalled.** They render through `MuiPopover`, attached to `<body>`, so an open menu
  is *not* inside the sidebar it belongs to. Give `clip` an **array** of selectors to capture the
  union of their bounding boxes instead of a single element.
- **Category menu buttons are 0×0 until their header is hovered.** Hovering the whole
  `.SidebarChannelGroup` does not do it — its centre lands on the channel list. Hover
  `.SidebarChannelGroupHeader`.

After capturing, `capture.js` prints ready-to-paste `media:` blocks for the guide content file.

## Capturing from a remote server

Some guides cover licensed products. Playbooks will not start on an unlicensed server at all —
it exits with "this plugin requires a professional license or higher" — so its art cannot come
from the seeded fixture world like everything else.

```bash
export MM_REMOTE_URL=https://your-test-server.example.com
export MM_REMOTE_TOKEN=...        # Profile → Security → Personal Access Tokens
make capture ARGS=--remote
```

`--remote` runs only the shots marked `source: 'remote'`, and a normal run skips exactly those.
The declutter layer and per-shot `viewport` apply here exactly as they do locally.

The token is a personal access token on that server. If the account is a system admin, Mattermost
warns that the token carries System Admin permissions; the harness never writes in this mode, but
revoke the token when the pass is done.
The two sets are mutually exclusive on purpose: a shot written against seeded fixtures cannot
find its channels on another server, and a shot written against that server's content has
nothing to match locally.

Licensed *core* features come from here too: scheduled messages and acknowledgements are sent to
the client only with a Professional licence or higher (`server/config/client.go`), so an unlicensed
server's menus simply lack them. Reaching those menus means typing into a composer, which saves a
draft on the remote server. Those shots carry a `teardown` that empties the composer, deleting the
draft; the harness runs it after the shot, pass or fail, and prints a warning if it could not.
Afterwards, confirm the account has no drafts:
`GET /api/v4/users/<id>/teams/<team-id>/drafts` answers `null` when there are none.

**Nothing is seeded in this mode.** Seeding lives in the local branch of `capture.js` and is
never reached, which matters because `seed.js` creates users, channels and posts — pointing it
at a shared server would write fixture clutter into someone else's workspace.

Two things differ from a local run:

- **A fresh browser context per shot.** Reusing one page across a long remote run degrades: the
  first five or six shots land and everything after them times out waiting for content that
  loaded fine earlier. Discarding the context between shots costs a couple of seconds each and
  removes the whole class of problem.
- **One retry per shot.** A cold cloud server is sometimes slow to hand over a heavy run page,
  and a shot that timed out on one pass routinely succeeds on the next. This cannot mask a
  broken shot — a wrong selector fails every attempt.

The identity guard still runs, but only checks this machine's hostname. The account on a remote
server belongs to that server, not to whoever is running the harness, and the shared test
account is often called `admin` — a five-character substring that matches "administrator" and
any playbook named after its owner, so checking it there produces nothing but false positives.

`shots.lock.json` records `remoteHost` next to the version, so it is always visible which shots
came from where.

## The mock LLM

`fixture_ai.js` is a stand-in model on `127.0.0.1:8099`, so Agents shots need no API key, no
network and no bill. The real reason it exists is reproducibility: a live model writes different
prose every run, and a screenshot of that can never be re-captured.

Two things about it cost real time to find, and neither is guessable:

- **Agents speaks the Responses API, not Chat Completions.** It posts to `/v1/responses` with
  `Accept: text/event-stream`, and sizes prompts through `/v1/responses/input_tokens`. A stub that
  implements only `/v1/chat/completions` is never called, and the agent answers "Sorry! The LLM
  did not return a result." — which reads as a broken model rather than a wrong endpoint.
- **The Rewrite actions are structured-output callers.** Their system prompt says "You are a JSON
  API", names the property it will parse (`rewritten_text`) and restates it as a JSON schema.
  Prose there is not a wrong answer, it is a protocol error: "Failed to parse rewrite response
  from AI." The stub reads the property name back out of the prompt and wraps its reply in it.

`MOCK_DUMP=1` prints request bodies, which is how both of those were found. Reach for it first
when a surface says the model failed.

Agents 2.7.0 keeps its service configuration in the plugin's own store, not in
`PluginSettings.Plugins["mattermost-ai"]`, so writing that key through the config API is silently
ignored. `setup_agents.mjs` drives the System Console form instead, and creates the agent through
the Agents page — a one-time step per server:

```bash
MM_ADMIN_TOKEN=... node setup_agents.mjs
```

## Not yet done

- **One theme only** (denim). Multi-theme capture needs the runtime theme resolver from the
  `scene-media` branch — a static `<img>` cannot adapt, and capturing five themes before the
  renderer can choose between them would only add unused binaries.
- **No annotation layer.** Callout arrows and rings are meant to live as data over the image, not
  be drawn into it. That also comes from `scene-media`.
- **AI search** (both guides' AI Search step) needs Agents' embedding search, which the plugin
  reports only when it is configured with an embeddings provider and pgvector is in the database.
  Neither the local server nor the test server has it (`/plugins/mattermost-ai/ai_bots` returns
  `searchEnabled: false`). When it does, capture it once and `copyTo: ['advanced-search']`.
- **Summarize Calls** needs a call recording and its transcription. The test server has Calls, but
  an older Agents (1.2.2) than the rest of the AI guide, and recording a call there is a real write
  to a shared server.
- **About Mattermost reads "Server Version: dev".** True of a dev build, and not what an admin
  upgrading sees. Capturing that one shot from a real server would fix it.

## Licence-gated plugin UI

A plugin can hide licensed UI outright instead of disabling it, so on an unlicensed server a
feature looks *removed*. That cost a whole pass once: the AI guide's Summarize Thread, channel
summaries and New Messages "Ask AI" were all missing from Agents on the dev server and were
reported as replaced by Custom prompts. They had not been. The strings were in the plugin's bundle
the whole time:

```bash
grep -o 'Summarize Thread' ~/Projects/mattermost/server/plugins/mattermost-ai/webapp/dist/main.js
```

and around them, the condition. Agents' webapp renders that UI when `gi(state)` is true — a
licence SKU of `entry`, `enterprise` or `advanced`, or **`EnableTesting` and `EnableDeveloper`
both on**. The second is a developer override, and it shows the real licensed UI with no licence
at all. The same gate is what disables "Create agent" once one agent exists ("Multiple
self-service agents require a qualifying Mattermost plan").

`setup_agents.mjs` turns the override on. `capture.js` checks it before any AI shot runs and fails
with instructions if it is off, instead of letting each shot time out on a button that is simply
not drawn. `EnableTesting` also enables a `/test` command. It does not appear in the command-picker shots,
whose visible list ends at `dnd`; check that still holds if those shots change.

When a step's control is not on screen, search the bundle before deciding it is gone.
