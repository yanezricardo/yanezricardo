# Security maintenance

This is a static site, but its development and build tools execute dependency code.
A clean audit and valid signatures do not prove the absence of malware.

## Installing and updating

Use Node from `.node-version` and npm 11.17.0. Run `npm ci` to reproduce the reviewed
lockfile. Lifecycle scripts, Git dependencies, and direct URL dependencies are
blocked by `.npmrc`. Do not override these settings to make an install pass.

New version resolution waits seven days; this does not re-age versions already
accepted in the lockfile. Dependabot checks ordinary updates monthly after a seven-day cooldown.
Minor and patch releases are grouped separately for site dependencies, development
tools, and Actions. At most two npm and one Actions version-update PRs stay open.
Major releases remain separate proposals and need an explicit compatibility and
benefit review; being newer alone is not a reason to merge. These groups apply
only to version updates, and the PR limits do not apply to security updates.
Security updates and alerts remain enabled, without a blanket major-version
ignore rule that could hide a necessary fix.
Review every lockfile change, including new transitive dependencies, sources,
install scripts, and unexpected publisher or provenance changes. A lockfile
preserves an accepted package; it cannot make a malicious package safe.

For an urgent security fix, review the exact advisory and patched version first.
If the age policy blocks resolution, use a temporary package-specific
`min-release-age-exclude` override, inspect the resulting lockfile, and remove the
override before committing. Do not disable signature checks, script blocking,
or vulnerability checks. Security updates must not wait merely to satisfy the
ordinary update cooldown.

Run `npm audit signatures`, `npm audit --audit-level=low`, `npm run format:check`,
`npm run check`, and `npm run build` before proposing a merge. CI repeats these
checks and reviews dependency changes on pull requests. PRs cannot upload the
Pages artifact or run the deployment job in this workflow.

## Credentials and execution

Test unfamiliar dependencies in a disposable environment without personal SSH
keys, cloud credentials, mounted home directories, or access to a host Docker
socket. `ignore-scripts` does not sandbox `npm run build`, formatters, or imports.
Never commit credentials; `.env` variants are ignored, except `.env.example`,
which must contain placeholders only. GitHub secret scanning and push protection
are enabled, but detection does not cover every possible secret.

The build job has read-only repository permissions and does not persist checkout
credentials. Only the separate deployment job receives Pages and OIDC write
permissions. Actions are pinned to commit SHAs. Keep main protected by required
PR checks, prohibit force pushes/deletion, and review workflow changes carefully.

## Incident response

If a dependency compromise is reported, stop running the affected tools and
identify the exact package versions and execution times. Revoke potentially
exposed credentials from a clean environment, inspect workflow runs and published
artifacts, replace compromised dependencies, and rebuild from a reviewed commit.
Report sensitive findings through GitHub private vulnerability reporting when
available; never put live credentials in a public issue.
