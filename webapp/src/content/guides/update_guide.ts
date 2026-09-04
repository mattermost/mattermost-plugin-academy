// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Guide} from 'content/types';

const updateGuide: Guide = {
    id: 'update-guide',
    title: 'Upgrading Mattermost',
    heroTitle: 'Upgrade your server without surprises',
    subtitle: 'Six modules covering release tracks, upgrade paths, pre-flight checks, the procedure for your deployment type, verification, and rollback.',
    description: 'Plan and run a Mattermost server upgrade — release tracks, upgrade paths, pre-flight checks, deployment procedures, verification, and rollback.',
    icon: 'update',
    audiences: ['admin'],
    doneTitle: 'You\'re ready to run the upgrade',
    doneSummary: 'You\'ve covered release tracks, upgrade paths, pre-flight checks, the procedure for your deployment type, verification, and rollback. Keep these three pages open on the day:',
    doneLinks: [
        {label: 'Upgrade Mattermost', href: 'https://docs.mattermost.com/administration-guide/upgrade-mattermost.html'},
        {label: 'Important Upgrade Notes', href: 'https://docs.mattermost.com/administration-guide/upgrade/important-upgrade-notes.html'},
        {label: 'Release policy', href: 'https://docs.mattermost.com/product-overview/release-policy.html'},
    ],
    modules: [
        {
            id: 'know-your-track',
            navTitle: 'Know Your Track',
            icon: 'update',
            minutes: 4,
            title: 'Monthly releases or Extended Support Release',
            summary: 'Mattermost publishes a new server release on the 16th of each month. Extended Support Releases are published every 9 months and supported for 12. Pick a track deliberately, because it determines how often you upgrade and how long you have before security fixes stop.',
            steps: [
                {
                    title: 'Find the version you are running',
                    description: 'Select your profile picture, then <strong>About Mattermost</strong>. The dialog reports your <strong>Mattermost Version</strong> and your <strong>Database Schema Version</strong>. Record both. The schema version is the number you compare against if you ever need to roll a migration back. See the <a href="https://docs.mattermost.com/end-user-guide/collaborate/view-system-information.html">view system information</a> documentation for details.',
                    media: {
                        type: 'image',
                        file: 'about-mattermost.webp',
                        alt: 'The About Mattermost dialog, showing the server version and database schema version',
                    },
                },
                {
                    title: 'The monthly track',
                    description: 'Mattermost releases a new server version on the 16th of each month. Choose this track when you want features and fixes as soon as they ship and your organization can absorb frequent upgrades. Current and upcoming releases are listed on the <a href="https://docs.mattermost.com/product-overview/mattermost-server-releases.html">Server Releases</a> page.',
                },
                {
                    title: 'The Extended Support Release track',
                    description: 'Extended Support Releases (ESRs) are released every 9 months and supported for 12 months. Security fixes and major bug fixes are backported to a supported ESR, but ESRs don\'t add product functionality or new features. Choose this track when stability matters more than new capability, or when every upgrade has to clear a long internal testing and certification process.',
                    tip: 'ESRs ship every 9 months but stay supported for 12, so a new ESR and the outgoing one are supported at the same time for roughly three months. Treat that window as your certification time, and don\'t plan to spend all of it.',
                },
                {
                    title: 'Check where your version sits in the life cycle',
                    description: 'Mattermost announces end-of-life ahead of time so you can test, certify, and deploy a newer release before support ends. Support for <strong>v10.11 ESR</strong> reached the end of its life cycle on <strong>August 15, 2026</strong>, and upgrading to <strong>v11.7 ESR</strong> or later is required. Confirm the status of your own version against the <a href="https://docs.mattermost.com/product-overview/mattermost-server-releases.html">Server Releases</a> page rather than a date you remember.',
                },
            ],
        },
        {
            id: 'plan-the-path',
            navTitle: 'Plan the Path',
            icon: 'flag-outline',
            minutes: 4,
            title: 'Map the path before you download anything',
            summary: 'An upgrade is a route, not a jump. Which versions you pass through determines whether migrations are tested, whether backwards compatibility holds, and whether you hit a known bad combination.',
            steps: [
                {
                    title: 'Read the Important Upgrade Notes for every version in between',
                    description: 'Read the notes for every intermediate version, not just your target. Migrations, schema changes, and required configuration changes are documented per version, and a note attached to a version you pass through still applies to you. Start at the <a href="https://docs.mattermost.com/administration-guide/upgrade/important-upgrade-notes.html">Important Upgrade Notes</a> page.',
                },
                {
                    title: 'Prefer one ESR to the next ESR',
                    description: 'Upgrading from one ESR to the next is fully supported and tested. Upgrading across multiple ESR versions is supported, but not tested. If you have to skip versions, step through the ESRs instead of jumping. For example, from v8.1 ESR upgrade to the v9.5 or v9.11 ESR, then to the v10.11 ESR, then to the v11.7 ESR.',
                },
                {
                    title: 'Database backwards compatibility reaches one ESR back',
                    description: 'Mattermost aims for non-locking, backwards-compatible migrations, but that <strong>backwards compatibility guarantee extends only to the last ESR version</strong>. Stepping ESR1 to ESR2 and then ESR2 to ESR3 preserves compatibility; going straight from ESR1 to ESR3 does not. This matters most in a cluster, where older nodes still talk to the migrated database during a rolling upgrade.',
                    tip: 'For a delayed upgrade, upgrade to the closest ESR first and work forward from there. Don\'t jump straight to the newest release.',
                },
                {
                    title: 'Look for blocked version combinations',
                    description: 'Some specific version pairs are called out as unsafe. As one documented example, customers should not upgrade from v10.11.17 or later to v11.7.2 or earlier because of a bug affecting database migration numbers, which was fixed in v11.7.3. Combinations like this are only discoverable by reading the notes, which is why the first step in this module comes first.',
                },
            ],
        },
        {
            id: 'pre-flight',
            navTitle: 'Pre-flight',
            icon: 'playlist-check',
            minutes: 5,
            title: 'Pre-flight checklist',
            summary: 'Work through this list before you touch production. Every item exists because it is what you will wish you had done if the upgrade goes badly.',
            steps: [
            ],
            checklist: [
                {
                    title: 'Full database backup',
                    description: 'Back up the database using your organization\'s standard procedure, and confirm you could actually restore it. If the upgrade fails partway, loading a previous database snapshot is your recovery path.',
                },
                {
                    title: 'Application directory backup',
                    description: 'Copy the whole install directory into a dated archive folder, for example <strong>sudo cp -ra mattermost/ mattermost-back-$(date +\'%F-%H-%M\')/</strong>. Custom directories such as TLS keys or an alternate file storage path are <strong>not</strong> preserved by the documented upgrade steps, so the backup is how you get them back.',
                },
                {
                    title: 'config.json backup',
                    description: 'Keep a separate copy of <strong>config.json</strong>. Configuration settings can change between versions, and if you downgrade you will need to revert configuration to what the older version expects.',
                },
                {
                    title: 'Plugin and integration compatibility review',
                    description: 'List your installed plugins and check each one against the target server version before you upgrade. Prepackaged plugins ship with the release, but anything you added yourself may need its own upgrade. The changelog for each release records the prepackaged plugin versions it contains.',
                },
                {
                    title: 'PostgreSQL version',
                    description: 'Mattermost requires <strong>PostgreSQL 14.0 or later</strong>, and v11.7 ESR sets 14.x as the minimum. Mattermost aligns its minimum with the oldest version the PostgreSQL community still supports, and raises the floor at ESR releases, so check the <a href="https://docs.mattermost.com/deployment-guide/software-hardware-requirements.html">software and hardware requirements</a> before you plan. PostgreSQL 14 itself reaches community end-of-life on 2026-11-12.',
                },
                {
                    title: 'MySQL deployments must migrate first',
                    description: 'New installations on MySQL stopped being supported in v10, and <strong>MySQL support ended with v11.0</strong>. If you are still on MySQL you need to migrate to PostgreSQL before you can move past the v10.11 ESR. Plan that migration as its own project, not as part of the upgrade window.',
                },
                {
                    title: 'Search backend check',
                    description: 'Experimental Bleve search was removed in v11.0. If Bleve is enabled, set <strong>DisableDatabaseSearch</strong> to <strong>false</strong> before upgrading or search will stop working. For enterprise search, Elasticsearch and OpenSearch remain supported backends.',
                },
                {
                    title: 'Disk space',
                    description: 'If the database runs on the same server as Mattermost, allow at least <strong>2GB free</strong> for extraction, copy, and cleanup, plus at least twice the size of your Mattermost installation available for the database.',
                },
                {
                    title: 'Staging rehearsal',
                    description: 'Run the whole upgrade end to end in a staging environment that mirrors production, using a realistic data volume. This is where you discover misconfigurations and long-running migrations, and where you time the maintenance window.',
                },
                {
                    title: 'Maintenance window and communication',
                    description: 'Define the window, then notify users at 7 days, 3 days, and 1 day out by email and in channels, set a system-wide banner, and configure a maintenance message on your load balancer. See the <a href="https://docs.mattermost.com/administration-guide/upgrade/communicate-scheduled-maintenance.html">scheduled maintenance best practices</a> documentation for templates.',
                },
            ],
        },
        {
            id: 'running-it',
            navTitle: 'Running It',
            icon: 'server-variant',
            minutes: 6,
            title: 'Run the upgrade for your deployment',
            summary: 'The mechanics differ by deployment type, but the database work is the same everywhere. Read the shared notes below, then follow the tab that matches how you run Mattermost.',
            steps: [
                {
                    title: 'Schema migrations run when the new server starts',
                    description: 'Outstanding database migrations are applied by the server on startup, so the first boot after an upgrade can take noticeably longer than a normal restart. How long depends on your dataset size and how many versions you are crossing. Recent migrations are written to be non-blocking and backwards compatible, and the Important Upgrade Notes document the exceptions, including the SQL involved and its expected impact.',
                },
                {
                    title: 'Save a migration plan so the change is reversible',
                    description: 'Run the migration with <strong>mattermost db migrate --save-plan</strong>. The plan is stored in the file store and contains both the forward and the rollback SQL, which gives you a record of what was applied and a much simpler downgrade later.',
                    tip: 'Combine --save-plan with --dry-run to review a plan before anything is applied.',
                },
                {
                    title: 'High availability clusters need every node upgraded',
                    description: 'Apply the upgrade to every node in the cluster. When you\'re done, the <strong>Config File MD5</strong> columns in the high availability section of the System Console should be green; yellow means nodes disagree on server version or configuration. Running two different Mattermost versions in a cluster should not happen outside of an upgrade. Review the <a href="https://docs.mattermost.com/administration-guide/upgrade/prepare-to-upgrade-mattermost.html">prepare to upgrade</a> documentation for cluster-specific guidance.',
                },
            ],
            variants: [
                {
                    label: 'Tarball',
                    steps: [
                        {
                            title: 'Download the release into a temporary directory',
                            description: 'Change to <strong>/tmp</strong> and delete anything left from a previous download. Fetch the release for your edition, replacing X.X.X with the target version: <strong>wget https://releases.mattermost.com/X.X.X/mattermost-X.X.X-linux-amd64.tar.gz</strong> for Enterprise Edition, or <strong>mattermost-team-X.X.X-linux-amd64.tar.gz</strong> for Team Edition. Confirm no other Mattermost archive is present before you extract.',
                        },
                        {
                            title: 'Extract to a non-conflicting directory',
                            description: 'Use the <strong>tar</strong> command given in the <a href="https://docs.mattermost.com/administration-guide/upgrade/upgrading-mattermost-server.html">upgrade documentation</a>. It adds a suffix to the top-level extracted directory so it becomes <strong>mattermost-upgrade</strong> and cannot collide with your install directory.',
                        },
                        {
                            title: 'Stop the server and take the backups',
                            description: 'Stop the service with <strong>sudo systemctl stop mattermost</strong>. Back up the database using your standard procedure, then archive the application directory with <strong>sudo cp -ra mattermost/ mattermost-back-$(date +\'%F-%H-%M\')/</strong>. Do not proceed until both backups exist.',
                        },
                        {
                            title: 'Remove the old application files',
                            description: 'The documented <strong>find</strong> command removes the old files while pruning <strong>config</strong>, <strong>logs</strong>, <strong>plugins</strong>, <strong>client/plugins</strong>, and <strong>data</strong>. Anything else you added, including TLS certificates and keys or a custom attachment directory, is not preserved unless you append its path to the command. Run the command without the deletion step first as a dry run, and read the output.',
                            tip: 'Run ls on your install directory before you start so you know exactly which directories are yours rather than part of a default installation.',
                        },
                        {
                            title: 'Copy the new files in',
                            description: 'Run <strong>sudo cp -an /tmp/mattermost-upgrade/. mattermost/</strong>. Both details matter: the <strong>-n</strong> flag preserves your existing configuration and logs, and the trailing <strong>.</strong> on the source ensures every installation file is copied.',
                        },
                        {
                            title: 'Restore ownership and capabilities',
                            description: 'Set ownership on the new files, for example <strong>sudo chown -R mattermost:mattermost mattermost</strong>, substituting the owner and group your installation actually uses. If Mattermost serves port 80 or 443 directly, or you terminate TLS on the server, re-grant the capability with <strong>sudo setcap cap_net_bind_service=+ep ./mattermost/bin/mattermost</strong>.',
                        },
                        {
                            title: 'Start the server and clean up',
                            description: 'Start with <strong>sudo systemctl start mattermost</strong>, watch the logs while migrations apply, then remove the temporary files with <strong>sudo rm -r /tmp/mattermost-upgrade/</strong>. In a cluster, repeat every step above on each node.',
                        },
                    ],
                },
                {
                    label: 'Docker',
                    steps: [
                        {
                            title: 'Shut down the deployment',
                            description: 'From your <strong>mattermost/docker</strong> clone, bring the stack down with the same compose files you brought it up with, for example <strong>docker compose -f docker-compose.yml -f docker-compose.nginx.yml down</strong>, or the <strong>docker-compose.without-nginx.yml</strong> variant if you run your own proxy.',
                            tip: 'Docker deployments don\'t support clustered or high availability configurations out of the box. If you need HA, deploy on Kubernetes instead.',
                        },
                        {
                            title: 'Pull repository changes and diff your environment file',
                            description: 'Run <strong>git pull</strong> to pick up recent changes to the repository, then compare <strong>env.example</strong> against your own <strong>.env</strong>. New or renamed variables appear in the example file first, and missing them is a common cause of a failed restart.',
                        },
                        {
                            title: 'Set the image tag to your target version',
                            description: 'Edit <strong>MATTERMOST_IMAGE_TAG</strong> in <strong>.env</strong> to point at the enterprise or team image version you want. Use a specific version tag such as <strong>release-11.7</strong> rather than a generic tag such as <strong>release-11</strong>. Generic tags are intended for development and don\'t automatically receive new patch releases, so pinning a specific tag keeps your deployment reproducible.',
                        },
                        {
                            title: 'Redeploy and watch the first boot',
                            description: 'Bring the stack back up with <strong>docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d</strong>, matching the compose files you used to shut it down. Follow the Mattermost container logs while migrations run before you tell anyone the upgrade is finished. Full steps are in the <a href="https://docs.mattermost.com/deployment-guide/server/deploy-containers.html">container deployment</a> documentation.',
                        },
                    ],
                },
                {
                    label: 'Kubernetes Operator',
                    steps: [
                        {
                            title: 'Confirm the cluster is healthy first',
                            description: 'Check that nodes are ready and pods are running cleanly with <strong>kubectl get nodes</strong> and <strong>kubectl get pods --all-namespaces</strong>, then confirm there is CPU and memory headroom for the rollout using <strong>kubectl top nodes</strong>. An upgrade is a poor time to discover the cluster was already under pressure.',
                        },
                        {
                            title: 'Upgrade the Operator before the server',
                            description: 'Upgrade the Mattermost Operator first and confirm it is stable before you change the Mattermost server version. An older Operator may not support newer server versions or upgrade flows, so check the chart release notes for compatibility between the two.',
                        },
                        {
                            title: 'Set the target version on the custom resource',
                            description: 'Update the <strong>version</strong> field under <strong>spec</strong> in your <strong>mattermost-installation.yaml</strong> to the new version tag. Keeping this in a separate, version-controlled custom resource is the recommended pattern, and it makes the change reviewable and reversible.',
                        },
                        {
                            title: 'Apply and monitor the rollout',
                            description: 'Apply with <strong>kubectl apply -f mattermost-installation.yaml</strong>, then follow progress with <strong>kubectl get pods -n mattermost</strong> and <strong>kubectl logs -f [pod-name] -n mattermost</strong>. The Operator runs validation checks before rollout and applies nothing if they fail. When they pass, it replaces pods incrementally and terminates old pods only after health checks pass.',
                        },
                        {
                            title: 'Coordinate Active/Active sites one at a time',
                            description: 'If you run multiple clusters, use your global load balancer or DNS to route traffic away from the site being upgraded, disable writes on that site until the upgrade is validated, and confirm only one site is writing at any moment. Confirm database and storage replication health before moving to the next site. See the <a href="https://docs.mattermost.com/administration-guide/upgrade/upgrade-mattermost-kubernetes-ha.html">Kubernetes and high availability upgrade</a> documentation for the full procedure.',
                        },
                    ],
                },
                {
                    label: 'Helm',
                    steps: [
                        {
                            title: 'Refresh the chart repository',
                            description: 'Run <strong>helm repo update</strong> so you are resolving against current chart versions before you plan the upgrade.',
                        },
                        {
                            title: 'Apply the chart CRDs yourself',
                            description: 'Helm doesn\'t upgrade custom resource definitions during a release upgrade, so apply them first. Pull the chart sources with <strong>helm pull mattermost/mattermost-operator --untar --version [version]</strong>, then apply <strong>kubectl apply -f mattermost-operator/crds/</strong>. Skipping this is a common cause of a rollout that appears to succeed but never picks up new fields.',
                        },
                        {
                            title: 'Upgrade the Operator release',
                            description: 'Run <strong>helm upgrade mattermost-operator mattermost/mattermost-operator -n [namespace]</strong>, adding <strong>-f</strong> with your values file if you maintain custom values. Confirm the Operator is stable before changing the server version.',
                        },
                        {
                            title: 'Set the server version in your values file',
                            description: 'Update the image <strong>tag</strong> in <strong>values.yaml</strong> to the target Mattermost version, then apply it with <strong>helm upgrade mattermost mattermost/mattermost-operator -f values.yaml</strong>. Keep <strong>values.yaml</strong> and any secrets in version control so the change is reviewed and consistent across clusters.',
                            tip: 'Because the change lives in a values file, this step fits cleanly into a GitOps pipeline such as Argo CD or Flux, with staging promotion before production.',
                        },
                    ],
                },
            ],
        },
        {
            id: 'verify-and-roll-back',
            navTitle: 'Verify & Roll Back',
            icon: 'refresh',
            minutes: 5,
            title: 'Verify the upgrade, and know how to reverse it',
            summary: 'An upgrade isn\'t finished when the server starts. Confirm the version, prove the backends are reachable, exercise the product, and make sure you can retreat if you need to.',
            steps: [
                {
                    title: 'Confirm the version and schema version',
                    description: 'Open <strong>About Mattermost</strong> and check that both <strong>Mattermost Version</strong> and <strong>Database Schema Version</strong> moved as expected. On Kubernetes, confirm every pod is running the intended image with <strong>kubectl get pods -n mattermost -o=jsonpath=\'{.items[*].spec.containers[*].image}\'</strong>.',
                    media: {
                        type: 'image',
                        file: 'about-mattermost.webp',
                        alt: 'The About Mattermost dialog, showing the server version and database schema version',
                    },
                },
                {
                    title: 'Ping the health endpoint',
                    description: 'Call <strong>GET /api/v4/system/ping</strong> to check that the server is up and healthy. Adding <strong>get_server_status=true</strong> extends the response with <strong>database_status</strong> and <strong>filestore_status</strong>, which verifies backend connectivity rather than just process liveness. The same endpoint is what you give to schedulers and load balancer probes. See the <a href="https://docs.mattermost.com/administration-guide/manage/configure-health-check-probes.html">health check probes</a> documentation for details.',
                },
                {
                    title: 'Read the logs and then use the product',
                    description: 'Check the server logs for errors and warnings raised during startup and migration, then smoke test by hand: sign in, move between teams and channels, post a message, upload a file, and confirm your integrations, webhooks, and plugins still work. Automated checks won\'t catch a plugin that loads but no longer renders.',
                },
                {
                    title: 'Watch the cluster for longer than you think you need to',
                    description: 'In a cluster, confirm the <strong>Config File MD5</strong> columns in the System Console read green. Then keep an eye on pod health and restarts, database replication health, and latency and error rates in your monitoring for a full business cycle before you call it done.',
                    tip: 'If MD5 columns stay yellow, change a setting in the System Console and change it straight back, then select Save. That propagates the existing configuration to every node without altering it.',
                },
                {
                    title: 'Know the limits of a downgrade before you need one',
                    description: 'Downgrading more than one major version back is not recommended. Rehearse the downgrade in staging, and confirm your plugins and integrations are compatible with the version you would be dropping to. Review the changelog for the target version so you know what functionality disappears.',
                },
                {
                    title: 'Roll the schema back with the newer binary',
                    description: 'Check where you are with <strong>mattermost db version --all</strong>, then stop the service so nothing writes during the downgrade. Roll migrations back with <strong>mattermost db downgrade</strong>, passing either the saved plan file or comma-separated migration numbers, for example <strong>mattermost db downgrade 128,127,126</strong>. Use the <strong>newer</strong> binary to run the downgrade, because it is the one that contains the rollback SQL. Then swap in the target version\'s binary, revert <strong>config.json</strong> to what that version expects, and restart.',
                    tip: 'This is the payoff for --save-plan. With a saved plan you can run mattermost db downgrade against the plan file instead of working out which migration numbers to reverse.',
                },
                {
                    title: 'On Kubernetes, roll back declaratively',
                    description: 'Set the <strong>version</strong> field in <strong>mattermost-installation.yaml</strong> back to the previous tag and run <strong>kubectl apply -f mattermost-installation.yaml</strong>, or for Helm-managed releases use <strong>helm rollback mattermost [revision_number]</strong>. If a migration can\'t be reversed cleanly, fall back to restoring your database and file store from the backups you took in pre-flight. Details are in the <a href="https://docs.mattermost.com/administration-guide/upgrade/downgrading-mattermost-server.html">downgrade</a> documentation.',
                },
            ],
        },
        {
            id: 'what-you-unlocked',
            navTitle: 'What You Unlocked',
            icon: 'star-outline',
            minutes: 3,
            title: 'Tell your users what they just got',
            summary: 'An upgrade nobody notices is an upgrade nobody adopts. Spend a few minutes turning the changelog into something your users will actually read.',
            steps: [
                {
                    title: 'Pick the highlights that matter to your users',
                    description: 'Read the changelog for every version you crossed, not just the one you landed on, and pick two or three changes your users will feel. Recent releases have concentrated on AI agents, enterprise search backends, performance and scale at large user counts, security and compliance controls, and admin tooling such as user attributes and mmctl. Skip the rest.',
                },
                {
                    title: 'Point people at the Academy guides',
                    description: 'Announce the upgrade in a channel with links people can act on. Send them to <a href="/academy/guides/ai-quick-start">AI Quick Start</a> for agents, summaries, and rewrites, <a href="/academy/guides/mattermost-basics">Messaging Basics & Productivity Tips</a> for anyone still finding their way around, and <a href="/academy/guides/advanced-search">Advanced Search</a> for people who lose time hunting for old messages.',
                },
                {
                    title: 'Fold the new release into your own admin routine',
                    description: 'Check the <strong>config.json</strong> section of the changelog for new or changed settings and decide which defaults you want to override. Then look ahead: the <a href="https://docs.mattermost.com/product-overview/deprecated-features.html">removed and deprecated features</a> page lists what is going away in upcoming releases, which is where your next upgrade plan starts.',
                },
            ],
        },
    ],
};

export default updateGuide;
