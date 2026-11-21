# Contributing to Entity Truth Core

Thank you for helping improve Entity Truth Core. Read [Product Scope](docs/PRODUCT_SCOPE.md) and the [Development Roadmap](docs/DEVELOPMENT_ROADMAP.md) before proposing a change.

## Non-negotiable scope

This project prepares local entity profiles; it does not investigate or verify them.

Contributions must not add:
- Website fetching, crawling, scraping or external source checks.
- External fact verification, even behind an optional flag.
- AI provider calls, search / SEO / GEO / AEO measurement, competitor analysis or strategy generation.
- MAAROOF AI production APIs, models, tools, orchestration, databases, secrets or hosted services.
- Telemetry, central data collection or a project-owned backend.

The browser label “by MAAROOF AI” is authorship/ownership attribution, not an integration contract.

## Development setup

Requirements: Node.js 20 or newer.

```bash
npm ci
npm test
```

CI verifies Node.js 20 and Node.js 22. Run the full test command before submitting changes.

## Engineering rules

1. Keep the TypeScript core as the single source of truth for CLI, MCP and browser behavior.
2. Preserve 100 lexical words as the default analysis window. Any new window must be explicit and validated.
3. All detected values are candidate patterns, not verified facts.
4. Do not infer markets, languages, official profiles, ownership, awards or certifications.
5. Keep the canonical Skill and Codex / Claude Code copies byte-identical.
6. Keep network calls out of runtime source code.
7. Add regression tests for Arabic, Sorani Kurdish and English behavior where relevant.
8. Avoid changing working modules unless the requested improvement requires it.

## Pull requests

A pull request should explain:
- The user-facing behavior being changed.
- Which shared core function is responsible.
- Tests added or updated.
- Confirmation that the change remains inside Product Scope.

Do not submit a PR that expands the project into external research or verification. Such a PR will be closed as out of scope.
