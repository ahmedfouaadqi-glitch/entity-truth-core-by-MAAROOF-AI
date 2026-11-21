# Changelog

## 0.1.0 — Initial isolated implementation

- Added first-100-word candidate-signal scanner.
- Added limited static name-hint heuristic.
- Added draft Organization JSON-LD and llms.txt-style profile generation.
- Added local CLI, JSON input, and guarded file export.
- Explicitly excludes global search, verification, AI visibility measurement, competitor analysis and MAAROOF AI production integration.

## Unreleased — local agent and self-hosting milestone

### Scope and local scan window
- Added a 30-case synthetic regression corpus covering English, Arabic, Sorani Kurdish and mixed RTL/LTR profile text, plus empty/short-input and source-preservation boundary checks.
- CI now exercises 80 tests on each of Node.js 20 and 22, including the local-only architecture guard.
- Added local Arabic-Indic and Persian digit normalization, Arabic percent and numeric separators, diacritic/tatweel removal and carefully scoped alef normalization while preserving original candidate text.
- Added candidate extraction for email, formatted or labelled telephone numbers, labelled addresses and labelled service lists; these are text candidates only and are not verified.
- Updated the browser playground to localize candidate category labels in Arabic, Sorani Kurdish and English.

- Locked the product boundary to local entity-profile preparation; external fact verification, crawling, source comparison, ranking/visibility measurement and MAAROOF AI production integration remain out of scope.
- Added selectable 100-word, 500-word and full-text local scan windows; 100 words remains the default for backwards-compatible behavior.
- Exposed the same scan-window setting through the TypeScript API, CLI, local MCP server and browser playground.
- Added regression coverage for scan-window boundaries, CLI parsing, API propagation and MCP stdio invocation.

- Added a local MCP stdio server with entity scan, name hint, profile generation and structural validation tools.
- Added a limited Organization JSON-LD structural validator; it does not replace full Schema.org validation.
- Added canonical Agent Skill instructions and Codex / Claude Code discovery copies.
- Changed the browser playground to import the compiled TypeScript core instead of maintaining duplicate scanner and profile-generation logic.
- Added user-owned static deployment templates for GitHub Pages and Netlify, plus Cloudflare Pages guidance.
- Added CODEOWNERS and documented the GitHub ruleset settings that the repository owner must enable manually.
- Added regression tests for MCP function behavior, skill consistency and shared browser-core usage.
- Kept MIT licensing. Forks remain modifiable under MIT; only the official repository and its official releases are controlled by the owner.
