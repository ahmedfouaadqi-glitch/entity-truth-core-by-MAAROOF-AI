# Release process

## Versioning contract

This project uses Semantic Versioning (`MAJOR.MINOR.PATCH`) for package versions.

- **MAJOR:** incompatible public API, CLI contract, MCP tool schema, or supported output contract changes.
- **MINOR:** backward-compatible features or newly supported input / output fields.
- **PATCH:** backward-compatible bug fixes, documentation corrections, and security fixes that do not break the supported contract.

`package.json` is the version source of truth. When changing the package version, update `package-lock.json` in the same change using npm; do not hand-edit lockfile version fields.

## Before creating an official release

1. Confirm the release commit is on the official `main` branch. Do not release from a feature branch or an unmerged pull request.
2. Review the complete `CHANGELOG.md` and move the relevant items under a dated version heading.
3. Run `npm ci`, `npm test`, `npm run prepare:pages`, and `npm pack --dry-run` using the supported Node.js 20 and 22 CI matrix.
4. Review `docs/PRODUCT_SCOPE.md`, the local-only architecture guard, dependency changes and security advisories.
5. Verify the main branch ruleset and official `v*` tag ruleset are Active, and confirm the intended release actor has the documented permissions.
6. Update `package.json` and `package-lock.json` using npm, then merge the version change through the protected pull-request path.
7. Create an annotated official tag in the form `vMAJOR.MINOR.PATCH` on the merged release commit.
8. Create release notes from the matching Changelog section. Publish to npm only after a separate owner decision and a review of package contents, ownership, provenance and publication credentials.

## Release stop conditions

- Do not create an official tag or release from an unmerged branch.
- Do not publish an npm package solely because CI passed.
- Do not publish if the package contains secrets, local customer data, generated reports, temporary files, or unreviewed assets.
- Do not create a release while required CI checks fail or the official version-tag ruleset is not active.
- Do not add external verification, hosted services, model-provider SDKs, telemetry or MAAROOF AI production dependencies as release prerequisites.

## Current publication status

The presence of this document does not mean that a release, tag, npm publication or deployment exists. The repository owner makes each publication decision explicitly.
