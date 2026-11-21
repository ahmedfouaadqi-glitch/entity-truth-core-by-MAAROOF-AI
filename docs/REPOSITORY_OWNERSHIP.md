# Official repository ownership and protection

## Ownership boundary

The public repository is the official project. The project owner controls changes to this repository, its official branches, official tags, package publication and any official hosted site.

Public read access and an open-source license do not give other users write access to this repository. The owner must verify the account list in **Settings → Collaborators and teams** and remove any account that should not have official write or administrative access.

MIT permits users to modify and redistribute their own copies and forks. It cannot be used to prohibit modifications to forks while still claiming the software is open source. Such modifications do not change this official repository or become official releases.

## CODEOWNERS

`.github/CODEOWNERS` assigns all repository paths to `@ahmedfouaadqi-glitch`. This creates a code-owner review request only when the relevant branch ruleset requires code-owner review; CODEOWNERS alone does not block writes or merges.

## Ruleset status

The owner has created and enabled this active branch ruleset:

- Name: `MAAROOF - Owner Control - All Branches`
- Target: all branches (`~ALL`)
- Rules: restrict creation, updates and deletion; block non-fast-forward updates (force pushes).
- Bypass: only the GitHub user `ahmedfouaadqi-glitch`, with `Always` bypass mode.

GitHub's Rulesets API confirmed the rule's active state, all-branches target, enabled rule types and user-specific bypass actor. The connected GitHub integration does not expose ruleset write operations, so additional rulesets must be created in GitHub Settings.

## Remaining GitHub controls

### 1. Verify account permissions

Open **Settings → Collaborators and teams** and verify:

- `ahmedfouaadqi-glitch` is the repository owner and has Admin permission.
- No unapproved account has Admin, Maintain or Write permission.
- Remove any access that is not explicitly required.

The connected GitHub integration can verify the authenticated owner's Admin permission, but it cannot enumerate the repository's collaborator list. Do not claim that the owner is the only administrator until this list is checked in GitHub Settings.

### 2. Main branch review gates

Create a separate active branch ruleset targeting only `main`:

- Name: `MAAROOF - Protect Main - PR and CI`.
- Require a pull request before merging.
- Require at least one approving review.
- Require review from Code Owners.
- Require both CI job checks: `Verify on Node 20` and `Verify on Node 22`.
- Block force pushes.
- Restrict deletion.
- Leave the bypass list empty so the PR and CI requirements also apply to the owner.

**Reviewer constraint:** a pull request author cannot approve their own pull request. Because the current CODEOWNERS entry names the repository owner, an owner-authored PR needs an independent reviewer to satisfy the one-approval and Code Owner review requirements. Do not weaken or bypass these gates merely to merge an owner-authored PR; arrange a trusted independent review.

### 3. Official version tags

Create an active tag ruleset:

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
- [ ] An active `main` ruleset requires PR, one approval, Code Owner review and both CI checks.
- [ ] An active `v*` tag ruleset restricts tag creation, update and deletion.
- [ ] All rulesets verified as Active, not Disabled or Evaluate.

Until the remaining collaborator-permission, `main` and `v*` controls are verified, the repository must not be described as fully protected. The implementation pull request therefore remains Draft and unmerged.
