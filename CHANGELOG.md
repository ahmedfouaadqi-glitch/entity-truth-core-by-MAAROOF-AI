# Changelog

## 0.1.0 — Initial isolated implementation

- Added first-100-word candidate-signal scanner.
- Added limited static name-hint heuristic.
- Added draft Organization JSON-LD and llms.txt-style profile generation.
- Added local CLI, JSON input, and guarded file export.
- Explicitly excludes global search, verification, AI visibility measurement, competitor analysis and MAAROOF AI production integration.

## Unreleased — local agent and self-hosting milestone

### Scope and local scan window
- Added a Sorani Kurdish quickstart for local CLI, reports and CSV batch usage.
- Added a regression test proving 20 CSV entity rows can be processed independently in one local batch.
- Added weekly Dependabot version-update configuration for npm and GitHub Actions; it becomes active only after the config reaches the default branch.
- Expanded `SECURITY.md` with responsible disclosure guidance and added a SemVer release process with explicit CI, protected-tag and owner-publication gates.
- Added a dependency-free local CSV batch parser and CLI workflow. Each row is processed independently, valid rows complete even when other rows fail, and `batch-summary.json` records row-level outcomes.
- Added explicit CSV header aliases, pipe-separated list fields, JSON-array parsing for opening hours and FAQs, strict unknown/duplicate-header handling, and a CSV input contract guide. Direct XLSX parsing remains deferred.
- Added local Markdown and self-contained HTML preparation reports, localized for Arabic, Sorani Kurdish and English, including scan metadata, original candidate values, field inventory, warnings, limitations and generated drafts.
- Added CLI `--report md|html|both` export and browser report-download controls; exports stay in the user-selected local folder or browser download flow.
- Escaped user-supplied values in HTML reports and tested malformed markup, RTL direction, code-fence collisions, overwrite protection and missing output-directory handling.
- Schema.org review: kept `ProfessionalService` as a legacy input only with an explicit deprecation warning; canonicalized opening-hours weekday values to Schema.org DayOfWeek identifiers.
- Added local JSON-LD drafts for Organization, LocalBusiness, ProfessionalService and Service, with optional PostalAddress, ContactPoint, OpeningHoursSpecification, OfferCatalog / Service and FAQPage structures from user-provided fields only.
- Expanded the local structural validator with precise field paths and English / Arabic messages; no link reachability, ownership or factual verification is performed.
- Exposed the same local profile fields through CLI flags / JSON input, MCP tools and the browser playground.
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
