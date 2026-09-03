# Mattermost Academy [![Download Latest Release](https://img.shields.io/badge/Download-Latest%20Release-blue)](https://github.com/mattermost/mattermost-plugin-academy/releases)

Short, interactive walk-through guides that help end-users and admins get more done in [Mattermost](https://github.com/mattermost/mattermost) — delivered as a full-screen product experience.

![Mattermost Academy guide catalog with progress tracking and badge completion](img/academy-catalog.png)

![Mattermost Academy guide module with step-by-step walk-through](img/academy-guide.png)

## Key Features

- **Interactive guides**: Step-by-step modules with screenshots and in-product walk-throughs
- **Badges**: Earn a badge when you finish a guide; optionally show badges on user profiles
- **Progress tracking**: Per-guide and module completion, with continue / review flows
- **Audience filters**: Browse guides for end-users, admins, or everyone
- **Access controls**: Admins choose who can use Academy and which guides are available
- **Completion reporting**: System Console charts and export for guide completion over time
- **Deep integration**: Entry points in the product switcher, apps bar, help menu, and `/learn` slash command

## Guides

### End-user

- **[Messaging Basics & Productivity Tips](webapp/src/content/guides/mattermost_basics.ts)**: Channels, threads, notifications, composing, formatting, and shortcuts
- **[AI Quick Start](webapp/src/content/guides/ai_quick_start.ts)**: Chat, summaries, calls, search, rewrites, and custom agents
- **[Slash Commands & Scheduled Messages](webapp/src/content/guides/slash_commands.ts)**: Slash commands and scheduled messages
- **[Advanced Search](webapp/src/content/guides/advanced_search.ts)**: Modifiers, date filters, file search, and AI semantic search
- **[Boards](webapp/src/content/guides/boards.ts)**: Boards, cards, properties, views, and channel links
- **[Playbooks](webapp/src/content/guides/playbooks.ts)**: Checklists, status updates, playbook setup, and retrospectives

### Admin

- **[Zero Trust](webapp/src/content/guides/zero_trust.ts)**: Mattermost security mapped to the five CISA Zero Trust pillars
- **[Upgrading Mattermost](webapp/src/content/guides/update_guide.ts)**: Release tracks, upgrade paths, pre-flight checks, verification, and rollback

### System Requirements

- Mattermost Server running a supported ESR or later version.

## Installation

1. [Download a release bundle](https://github.com/mattermost/mattermost-plugin-academy/releases). 
2. Upload and enable the plugin in **System Console → Plugins**
3. Optionally configure profile badges, user access, and review guide completions under **System Console → Plugins → Mattermost Academy**

## Quick Start

After installation:

1. Open Academy from the product switcher, apps bar, help menu, or run `/learn`.
2. Pick a guide from the catalog.
3. Work through modules; progress is saved as you go.
4. Finish a guide to earn a badge.

### Product Routes

| Path | Page |
|------|------|
| `/academy` | Guide catalog |
| `/academy/guides/<guideId>` | Redirect to first incomplete module |
| `/academy/guides/<guideId>/modules/<moduleId>` | Lesson |
| `/academy/guides/<guideId>/done` | Completion / badge |

## Development

### Prerequisites

- Go 1.25+
- Node.js 16+ / npm 8+
- A running Mattermost server for deploy/testing

### Local Setup

1. Set up your Mattermost development environment by following the [Mattermost developer setup guide](https://developers.mattermost.com/contribute/server/developer-setup/). If you already have a remote Mattermost server, you can skip this step.

2. Set up your Mattermost plugin development environment by following the [Plugin Developer setup guide](https://developers.mattermost.com/integrate/plugins/developer-setup/).

3. Clone the repository:
```bash
git clone https://github.com/mattermost/mattermost-plugin-academy.git
cd mattermost-plugin-academy
```

4. **Optional**. If you are developing against a remote server, set environment variables to deploy:
```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_USERNAME=<YOUR_USERNAME>
export MM_ADMIN_PASSWORD=<YOUR_PASSWORD>
```

5. Build and deploy the plugin:
```bash
make deploy
```

Hard-refresh the browser after deploy.

Build only (produces `dist/com.mattermost.academy-*.tar.gz` for manual upload):

```bash
make
```

### Make Commands

- Run `make help` for a list of all make commands
- Run `make check-style` to verify code style
- Run `make test` to run the unit test suite
- Run `make e2e` to run Cypress against a running Mattermost
- Run `make watch` to rebuild the webapp on change (then `make deploy-from-watch` to install)

### End-to-end tests (Cypress)

Cypress lives in `e2e-tests/cypress`, following the Playbooks layout: API login against a real Mattermost, specs under `tests/integration/**/*_spec.ts`.

1. Deploy the plugin to a running Mattermost (`make deploy`), using the same `MM_*` env vars as local deploy.
2. Run headless: `make e2e`
3. Or open the Cypress UI: `make e2e-open`

To start a disposable server instead of your dev instance:

```bash
docker compose -f e2e-tests/docker-compose.yml up -d
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
export MM_ADMIN_USERNAME=sysadmin
export MM_ADMIN_PASSWORD=Sys@dmin-sample1
bash e2e-tests/scripts/bootstrap-server.sh
make deploy
make e2e
```

Pull requests also run this suite in GitHub Actions (`.github/workflows/e2e.yml`).

### Continuous Integration

Pushes to `master`/`main` and pull requests run lint, unit tests, and a plugin build on GitHub Actions, using the same [plugin-ci](https://github.com/mattermost/actions-workflows/blob/main/.github/workflows/plugin-ci.yml) workflow as the [Mattermost plugin starter template](https://github.com/mattermost/mattermost-plugin-starter-template). A second workflow runs the Cypress smoke suite against a Docker Mattermost.

### Project Layout

| Path | Purpose |
|------|---------|
| `webapp/` | Product UI, catalog/guides/lessons, badges, admin sections |
| `webapp/src/content/` | Guide/module content (TypeScript) |
| `public/guides/assets/` | Lesson images and UI mock SVGs |
| `server/command/` | `/learn` slash command |
| `server/progress/` | Progress / completion API |
| `e2e-tests/cypress/` | Cypress smoke tests (catalog, badges, admin CSV) |
| `plugin.json` | Plugin id, name, and bundle paths |

Plugin id: `com.mattermost.academy`

## License

This repository is licensed under [Apache-2.0](./LICENSE).
