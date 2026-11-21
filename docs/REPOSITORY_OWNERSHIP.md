# Official repository ownership and protection

## Ownership boundary

The public repository is the official project. The project owner controls changes to this repository, the protected default branch, official tags, package publication and any official hosted site. Public read access and an open-source license do not give other users write access to this repository.

MIT permits users to modify and redistribute their own copies and forks. It cannot be used to prohibit modifications to forks while still claiming the software is open source. Such modifications do not change this official repository or become official releases.

## CODEOWNERS

`/.github/CODEOWNERS` assigns all repository paths to the repository owner. This creates a code-owner review request only when the relevant branch protection setting is enabled; CODEOWNERS alone does not block writes or merges.

## Required GitHub ruleset configuration

The GitHub connector used for this change does not expose the repository ruleset / branch-protection settings API. Apply these controls in the repository owner's GitHub account:

1. Open **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Target the default branch `main`.
3. Require a pull request before merging.
4. Require at least one approval and require review from Code Owners.
5. Require the CI verification check before merging.
6. Block force pushes and branch deletion.
7. Restrict bypass permissions to the repository owner only; avoid granting bypass to contributors or automation.
8. Create a separate tag ruleset for `v*` tags; restrict creation, update and deletion to the repository owner.
9. Confirm that no outside collaborator has Write, Maintain or Admin permission.

Until those rules are saved and verified in GitHub Settings, this repository must not be described as fully protected. Do not merge the current pull request merely because CODEOWNERS exists.
