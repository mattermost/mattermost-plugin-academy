# Guide screenshot capture

Drives a **local** Mattermost dev server with Playwright and writes clipped screenshots into
`public/guides/assets/<guideId>/`.

## Why local only

The output ships inside an Apache-2.0 plugin that goes to customers, so no real user, channel, or
message content may end up in a screenshot. `seed.js` creates invented fixtures — Alex Lindman,
Maya Kessler, an "Ops Bridge" channel — and `capture.js` refuses to run against any host other
than localhost. A populated demo server is fine as a *visual reference* for what realistic content
looks like; it is not a capture source.

## Prerequisites

- A local dev server running (`cd ~/Projects/mattermost/server && make run`)
- Plugin uploads enabled, and an admin account
- Node 18+ (for global `fetch`)

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

First run installs Playwright and downloads Chromium (~150MB).

### If Chromium will not launch

`playwright install` has hung on this machine at the *extraction* step — it downloads the full
archive, then never unpacks it, leaving a ~432KB stub with the Chromium Framework missing. The
launch then dies with `SIGABRT` or `Executable doesn't exist`, which reads like a corrupt download
but is not: the downloaded zip is intact and still sitting in `$TMPDIR`. Unpack it by hand rather
than re-downloading 200MB:

```bash
unzip -t $TMPDIR/playwright-download-chromium-mac15-arm64-*.zip   # confirm it is intact
D=~/Library/Caches/ms-playwright/chromium-1148
rm -rf "$D" && mkdir -p "$D"
unzip -q $TMPDIR/playwright-download-chromium-mac15-arm64-*.zip -d "$D"
touch "$D/INSTALLATION_COMPLETE"
```

Headless runs need the *headless shell*, a second package — repeat the above with
`playwright-download-chromium-headless-shell-mac15-arm64-*.zip` into
`chromium_headless_shell-1148`. Both directory names must match the build Playwright expects; it
is printed in the launch error. `PW_CHANNEL=chrome make capture` sidesteps the bundled browser
entirely by driving a locally installed Chrome, at the cost of a floating version.

Useful flags, passed through `ARGS`:

```bash
make capture ARGS=--headed              # watch the browser drive itself
make capture ARGS=--only=sidebar-overview
make capture ARGS=--keep-png            # keep the pre-conversion PNGs
```

## What it does

1. **Seeds** the server over the API — team, three fixture users, five channels, a short thread.
   Idempotent: re-running never duplicates content, which would shift every shot's layout.
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

Two runs in the same mode are byte-identical. Headless and headed still differ slightly — the
headless shell and full Chromium rasterize text differently — so pick one mode for a batch. The
default (headless) is the one to prefer; `--headed` is for watching a shot go wrong.

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
```

Measure before picking a number — crop to a category boundary rather than through one. With the cap
at 480px the four current shots render 270–540px wide. If you add a portrait shot, check what it
actually renders at rather than trusting that it captured cleanly.

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

## Not yet done

- **One theme only** (denim). Multi-theme capture needs the runtime theme resolver from the
  `scene-media` branch — a static `<img>` cannot adapt, and capturing five themes before the
  renderer can choose between them would only add unused binaries.
- **No annotation layer.** Callout arrows and rings are meant to live as data over the image, not
  be drawn into it. That also comes from `scene-media`.
- **AI Quick Start shots** need the Agents plugin installed and its AI service mocked for
  deterministic replies. Upstream ships `ai_bridge.ts` in `e2e-tests/playwright/lib` for this.
