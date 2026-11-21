# Importable GitHub rulesets

These JSON files are repository-level ruleset definitions for the official project. Import them from **Settings → Rulesets → New ruleset → Import a ruleset**. Select the downloaded JSON file, review the imported values, then create it with enforcement set to **Active**.

## Files

- `main-protection.json` — targets only `refs/heads/main`; requires a pull request, one independent approval, approval of the latest reviewable push, resolved review conversations, and both CI jobs (`Verify on Node 20` and `Verify on Node 22`). It also blocks force pushes and deletion. Its bypass list is intentionally empty.
- `official-version-tags.json` — targets `refs/tags/v*`; restricts creation, updates and deletion. The sole bypass actor is the repository owner, `ahmedfouaadqi-glitch`.

## Import procedure

1. Open the repository's **Settings → Rules → Rulesets** page.
2. Open **New ruleset** and choose **Import a ruleset**.
3. Download one JSON file from this directory to your computer, then select it in the import dialog.
4. Verify the imported name, target, enforcement status, rules and bypass list match the descriptions above.
5. Click **Create**.
6. Repeat for the second JSON file.
7. Return to the Rulesets list and confirm both rulesets are **Active**.

Import one file at a time. Do not import `main-protection.json` with a bypass actor added. Its empty bypass list is deliberate: the existing all-branches ruleset allows the owner to push, but this separate `main` ruleset must still enforce its PR, approval and CI gates.

## Important review requirement

The required approval must come from another user with repository write/admin permission; the PR author cannot approve their own PR. The current `.github/CODEOWNERS` assigns ownership only to `ahmedfouaadqi-glitch`, so this configuration does **not** require Code Owner approval yet. Do not enable that requirement until a second trusted code owner is added and the CODEOWNERS file is updated.

A trusted reviewer may be granted Write permission to review and approve PRs. The existing all-branches ruleset still restricts branch creation, updates and deletion to the owner bypass actor.

## Scope and effect

These rulesets protect only this official repository's `main` branch and official `v*` tags. They do not prevent users from modifying their own MIT-licensed forks. GitHub enforces an Active imported ruleset immediately after creation.
