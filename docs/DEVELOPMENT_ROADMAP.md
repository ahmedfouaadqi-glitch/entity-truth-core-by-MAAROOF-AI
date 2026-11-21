# Entity Truth Core — development roadmap

## Governing decision

Entity Truth Core is a local-first entity-profile preparation utility. It prepares; it does not investigate or verify. All stages below must comply with the [Product Scope](PRODUCT_SCOPE.md).

This roadmap supersedes the earlier proposal to implement an optional external-verification mode. The former P4 verification stage is excluded from this repository, not delayed behind a flag.

## Stage 0 — foundations and maintainability

**Goal:** make the project understandable, maintainable and easy to adopt without broadening its product scope.

- [x] Publish a clear README describing what the tool does and does not do.
- [x] Keep MIT licensing and user-owned hosting instructions.
- [x] Add CI for Node.js 20 and 22.
- [x] Add contributing guidance and issue / pull-request templates.
- [x] Add a CI badge to the README.
- [x] Document strict product boundaries.
- [x] Keep repository code ownership assigned to the official owner.
- [ ] Finish importing and verifying the main and v* GitHub rulesets.
- [ ] Review collaborators and repository permissions.
- [ ] Set the GitHub About description and repository topics.
- [ ] Decide separately whether to publish a GitHub Release and whether npm publication is appropriate. Neither is implied by this roadmap.

**Acceptance:** a new user can build and run the local CLI using the README; CI passes on both supported Node.js versions; repository guidance makes the limits unambiguous.

## Stage 1 — deeper local parsing and Arabic support

**Goal:** improve usefulness of deterministic local scanning while preserving compatibility.

### 1.1 Analysis window

- [x] Add 100, 500, and full local scan windows.
- [x] Keep 100 as the default.
- [x] Expose the same option through TypeScript input, CLI, MCP and browser playground.
- [x] Report the selected window and number of lexical words actually scanned.
- [x] Add boundary tests for 100 and 500 words, full text, invalid values and MCP / CLI propagation.

### 1.2 Remaining parsing improvements

- [ ] Add candidate extraction for email, telephone, year, address and service-name patterns.
- [ ] Normalize Arabic-Indic and Persian digits locally before numeric parsing.
- [ ] Improve Arabic normalization (diacritics, tatweel and carefully scoped letter normalization).
- [ ] Expand Arabic and Sorani Kurdish legal-form and organization-word dictionaries.
- [ ] Support user-supplied Arabic, Latin and abbreviated aliases as alternateName suggestions.
- [ ] Phrase name hints as warnings, never uniqueness or ownership claims.

### 1.3 Test corpus

- [ ] Add 30–50 curated, non-sensitive test cases across Arabic, Sorani Kurdish, English and mixed RTL/LTR input.
- [ ] Cover empty and short text, punctuation, Unicode marks, mixed digits, token boundaries and large input.
- [ ] Keep tests deterministic and independent of websites, APIs, models or live data.

**Acceptance:** selected-window behavior is stable; default behavior remains 100 words; all new patterns are explicitly labelled as candidates and do not claim factual verification.

## Stage 2 — broader local Schema.org preparation

**Goal:** generate and structurally check more useful profiles from values the user explicitly supplies.

- [ ] Add supported local output types only where there are clear input and validation contracts: LocalBusiness, ProfessionalService, Service, ContactPoint, PostalAddress, and OpeningHoursSpecification.
- [ ] Add optional FAQPage only from user-entered questions and answers.
- [ ] Add sameAs only for links supplied by the user; do not fetch or verify them.
- [ ] Add areaServed only from explicit user input; no inferred markets or worldwide coverage.
- [ ] Extend the local structural validator for only the supported output subset.
- [ ] Add clear Arabic and English validation messages with precise field paths.
- [ ] Improve llms.txt-style section templates while marking all generated content as a draft.

**Acceptance:** generated examples pass the project's own structural tests and a manually performed external format-validation check. A format check does not imply that entity facts, ownership or external links have been verified. No external service is called by the product.

## Stage 3 — local reports and exports

**Goal:** package the tool's own preparation output for handoff.

- [ ] Add local Markdown and HTML reports.
- [ ] Consider DOCX export only after the output schema and RTL rendering requirements are stable.
- [ ] Show selected scan window, candidate patterns, missing user-supplied fields, warnings and generated draft files.
- [ ] Add local CSV / Excel batch input only if each row is processed independently with no network calls.
- [ ] Allow report branding (logo, colors and provider details) without embedding a research or strategy engine.

**Hard limit:** reports may describe only user-supplied information and local tool output. Do not add competitor findings, market intelligence, source verification, visibility scores or strategy recommendations.

## Stage 4 — external verification

**Removed from scope.**

No verify mode, website fetching, crawling, HTTP reachability checks, source comparison, registry lookups or third-party verification package will be added to this repository. Making such behavior optional would still violate this product's defined boundary.

## Stage 5 — community and sustainability

- [ ] Keep Arabic and English documentation current; add Sorani guidance where practical.
- [ ] Maintain semantic versioning and a complete changelog.
- [ ] Add dependency update automation and review security advisories.
- [ ] Maintain Codex / Claude Code / MCP integration regression tests.
- [ ] Review privacy, runtime dependency and product-scope guardrails in every release.
- [ ] Keep deployment user-owned; do not introduce centralized data collection or hosting dependencies.

## Success measures

| Metric | Target |
|---|---:|
| Core test coverage | 85% or more |
| New-user local CLI setup | Under 5 minutes |
| Supported Schema.org output types | 7 or more, once Stage 2 is complete |
| Local batch processing | 20+ entities per run, once Stage 3 is complete |
| Runtime network requests | 0 |
| MAAROOF AI production dependencies | 0 |
| External verification / visibility features | 0 |

## Pull-request stop conditions

Reject a change from this roadmap if it introduces any of the following into runtime functionality: outbound network requests, external verification, crawlers, AI provider SDKs, MAAROOF AI production APIs, central databases, telemetry, search / GEO / SEO measurement, competitor analysis or strategy generation.

A feature outside the scope belongs in a different product decision and must not be smuggled into Entity Truth Core through a CLI option, optional module, MCP tool or Skill.
