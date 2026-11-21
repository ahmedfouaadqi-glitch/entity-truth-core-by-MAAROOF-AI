# Official repository ownership and protection

## Ownership boundary

The public repository is the official project. The project owner controls changes to this repository, its official branches, official tags, package publication and any official hosted site.

Public read access and an open-source license do not give other users write access to this repository. The owner must verify the account list in **Settings → Collaborators and teams** and remove any account that should not have official write or administrative access.

MIT permits users to modify and redistribute their own copies and forks. It cannot be used to prohibit modifications to forks while still claiming the software is open source. Such modifications do not change this official repository or become official releases.

## CODEOWNERS

`.github/CODEOWNERS` assigns all repository paths to `@ahmedfouaadqi-glitch`. This creates a code-owner review request only when the relevant branch ruleset requires code-owner review; CODEOWNERS alone does not block writes or merges.

## Required GitHub rulesets

The GitHub connector used for this change does not expose the repository ruleset settings API. Apply and verify these controls in the repository owner's GitHub account.

### 1. Owner-only official branches

1. Open **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Set enforcement status to **Active**.
3. Under branch targeting, select **Include all branches**. This is important: targeting only `main` does not protect development branches.
4. Add **Restrict creations**, **Restrict updates**, and **Restrict deletions**.
5. In the bypass list, allow only the repository administrator role. Do not add teams, GitHub Apps, maintainers or outside collaborators.
6. Open **Settings → Collaborators and teams** and verify that the repository owner is the only account with Admin permission. Remove any other Admin, Maintain or Write access that is not explicitly required.
7. Save and verify the ruleset shows **Active** and targets all branches.

With the update restriction enabled, only actors in the ruleset bypass list can push to matching branches. If repository admins other than the owner remain, they may also bypass the rule; therefore step 6 is required.

### 2. Main branch review gates

Create a separate active branch ruleset targeting only `main`:

- Require a pull request before merging.
- Require at least one approval.
- Require review from Code Owners.
- Require the CI check for the Node 20 / Node 22 verification workflow.
- Block force pushes.
- Restrict deletion.
- Keep bypass permissions limited to the repository administrator role; verify the owner is the only administrator.

The owner may use the approved administrative bypass when a direct owner-controlled correction is necessary. Normal changes should still use a pull request and CI.

### 3. Official version tags

Create an active tag ruleset targeting `v*`:

- Restrict creations.
- Restrict updates.
- Restrict deletions.
- Allow bypass only to the repository administrator role.
- Verify the owner is the only repository administrator.

This protects official version tags from being created, moved or deleted by ordinary collaborators.

## Verification checklist

- [ ] An active branch ruleset targets all branches.
- [ ] Restrict creations, updates and deletions are enabled for all branches.
- [ ] Only the owner account has Admin permission.
- [ ] No unapproved account has Maintain or Write permission.
- [ ] An active `main` ruleset requires PR, Code Owner review and CI.
- [ ] An active `v*` tag ruleset restricts tag creation, update and deletion.
- [ ] The owner has verified the rulesets are active, not disabled or in Evaluate mode.

Until the account permissions and active rulesets above are verified in GitHub Settings, this repository must not be described as fully protected. The current pull request therefore remains Draft and unmerged.
