# Official repository ownership and protection

## Ownership boundary

The public repository is the official project. The project owner controls changes to this repository, its official branches, official tags, package publication and any official hosted site.

Public read access and an open-source license do not give other users write access to this repository. The owner must verify the account list in **Settings → Collaborators and teams** and remove any account that should not have official write or administrative access.

MIT permits users to modify and redistribute their own copies and forks. It cannot be used to prohibit modifications to forks while still claiming the software is open source. Such modifications do not change this official repository or become official releases.

## CODEOWNERS

`.github/CODEOWNERS` currently assigns all repository paths to `@ahmedfouaadqi-glitch`. This identifies the owner for review requests, but CODEOWNERS alone does not block writes or merges.

**Important reviewer constraint:** pull request authors cannot approve their own pull requests. Because the current sole code owner is the repository owner, requiring Code Owner approval on `main` would block owner-authored PRs unless a second trusted code owner is added. Until that reviewer is appointed and added to CODEOWNERS, enforce one independent approval from a user with write/admin permission, but do not enable the separate required-Code-Owner-approval rule.

## Ruleset status

The owner has created and enabled this active branch ruleset:

- Name: `MAAROOF - Owner Control - All Branches`
- Target: all branches (`~ALL`)
- Rules: restrict creation, updates and deletion; block non-fast-forward updates (force pushes).
- Bypass: only the GitHub user `ahmedfouaadqi-glitch`, with `Always` bypass mode.

GitHub's Rulesets API confirmed the active state, all-branches target, enabled rule types and user-specific bypass actor. The connected GitHub integration does not expose ruleset write operations, so the remaining rulesets must be imported through GitHub Settings. Import-ready definitions are stored in `docs/github-rulesets/`.

## Remaining GitHub controls

### 1. Verify account permissions

Open **Settings → Collaborators and teams** and verify:

- `ahmedfouaadqi-glitch` is the repository owner and has Admin permission.
- No unapproved account has Admin, Maintain or Write permission.
- Remove any access that is not explicitly required.

The connected GitHub integration can verify the authenticated owner's Admin permission, but it cannot enumerate the repository's collaborator list. Do not claim that the owner is the only administrator until this list is checked in GitHub Settings.

### 2. Main branch review gates

Import `docs/github-rulesets/main-protection.json` from **Settings → Rulesets → New ruleset → Import a ruleset**. The definition targets only `refs/heads/main` and creates this active branch ruleset:

- Name: `MAAROOF - Protect Main - PR and CI`.
- Require a pull request before merging.
- Require at least one approving review from a user with write/admin permission.
- Dismiss stale approvals when new commits are pushed.
- Where available, require the most recent reviewable push to be approved by someone other than the person who pushed it.
- Require both CI job checks: `Verify on Node 20` and `Verify on Node 22`.
- Block force pushes.
- Restrict deletion.
- Leave the bypass list empty so the PR and CI requirements also apply to the owner.
- Do not enable required Code Owner approval until a second trusted code owner has been added to `.github/CODEOWNERS`.

The current PR author is the repository owner. That author cannot approve their own PR, so an independent reviewer with write/admin permission is required before it can merge.

### 3. Official version tags

Import `docs/github-rulesets/official-version-tags.json` from **Settings → Rulesets → New ruleset → Import a ruleset**. The definition targets `refs/tags/v*` and creates this active tag ruleset:

- Name: `MAAROOF - Protect Official Version Tags`.
- Target tag pattern: `v*`.
- Restrict creations, updates and deletions.
- Add only the GitHub user `ahmedfouaadqi-glitch` to the bypass list with `Always` mode.

This allows the owner to publish and manage official version tags while preventing other users with repository write access from creating, moving or deleting official `v*` tags.

## Verification checklist

- [x] An active branch ruleset targets all branches.
- [x] Restrict creations, updates and deletions are enabled for all branches.
- [x] The owner user is the only bypass actor in that ruleset.
- [ ] Repository collaborators and teams reviewed; no unauthorized Admin, Maintain or Write access remains.
- [ ] An active `main` ruleset requires PR, one independent approval and both CI checks.
- [ ] An active `v*` tag ruleset restricts tag creation, update and deletion.
- [ ] A second trusted code owner is designated before Code Owner approval is made mandatory.
- [ ] All rulesets verified as Active, not Disabled or Evaluate.

Detailed local import instructions are in `docs/github-rulesets/README.md`. After importing, verify that both new rulesets appear in GitHub as Active and their targets and bypass lists match the JSON files. Until the remaining collaborator-permission, `main` and `v*` controls are verified, the repository must not be described as fully protected. The implementation pull request therefore remains Draft and unmerged.
