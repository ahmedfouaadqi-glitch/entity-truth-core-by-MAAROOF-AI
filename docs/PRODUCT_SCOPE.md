# Entity Truth Core — product scope

## Product purpose

Entity Truth Core is a local-first utility for preparing a structured, machine-readable profile from information supplied by the user. It prepares; it does not investigate or verify.

The project is independently usable through its TypeScript core, CLI, local MCP stdio server, Agent Skills and browser playground. Its relationship to MAAROOF AI is attribution/ownership only; it does not depend on or call the MAAROOF AI production platform.

## In scope

- Deterministic, local processing of user-supplied entity names and text.
- Candidate pattern extraction from a selectable text window: 100 words (default), 500 words, or all supplied text.
- Arabic, Sorani Kurdish and English normalization and heuristic improvements that do not require external services.
- Generation of draft Schema.org JSON-LD and llms.txt-style entity profiles from explicit user input.
- Local structural validation of supported output structures, with clearly stated limitations.
- Local CLI, local MCP stdio tools, Skills and browser-playground usability.
- Local report/export formats that describe only the user's input and the tool's own candidate detections.
- Batch processing of local CSV/Excel/JSON inputs only when it remains local and does not turn into research or strategic analysis.
- User-owned hosting templates and documentation.

## Explicitly out of scope

These are not features to be implemented in this repository:

- External fact verification or an opt-in verification mode.
- Website fetching, crawling, scraping, HTTP reachability checks or third-party source comparisons.
- Verification of ownership of websites, social profiles, trademarks, addresses, certifications or claims.
- Search-engine, SEO, GEO, AEO, SGE or AI-answer visibility measurement, ranking or citation tracking.
- Competitor research, market intelligence, strategy, forecasts, predictions or recommendations.
- Continuous monitoring, scheduled collection or alerting.
- Calls to LLMs, AI provider SDKs, MAAROOF AI models, production APIs, internal tools, orchestration, databases, secrets or hosted services.
- Central telemetry, entity-data collection or a project-owned backend.

The external-verification proposal from the earlier roadmap (P4) is removed from this project's roadmap. Making it opt-in or placing it behind a CLI flag would still expand this product beyond its defined purpose.

## Runtime and data rules

1. User input is the only source of entity facts.
2. Runtime analysis remains local. No outbound requests are part of the core, CLI, browser processing, or MCP server.
3. File output is written only where the user explicitly requests it.
4. No data is sent to MAAROOF AI or any other hosted processing service.
5. Candidate detections must never be labelled as verified facts.
6. A valid URL string does not establish that a link is official or controlled by the entity.
7. Every output validator must state the exact structural subset it checks; it must not claim full Schema.org conformance unless a separately established test suite proves that.

## Dependency and architecture guardrails

- Do not add MAAROOF AI production packages, model-provider SDKs, search clients, web-crawling clients, telemetry, database clients or network transport dependencies.
- Keep the TypeScript core as the single source of truth for CLI, MCP and browser behavior.
- New capabilities must be deterministic for the same input, apart from explicitly variable metadata such as generated timestamps.
- Keep the Skill copies byte-identical to the canonical Skill.
- A proposal that needs remote research or verification is rejected from this repository, not hidden behind an optional flag.

## Pull request acceptance gates

A change is in scope only when all of the following are true:

- It operates on user-supplied or local input only.
- It does not add network calls, external verification or MAAROOF AI dependencies.
- It does not claim ranking, visibility, factual truth or link ownership.
- It has regression tests for supported languages and boundary conditions.
- CLI, MCP and browser entry points share the same core behavior where applicable.
- Documentation and Skill instructions preserve these boundaries.

## Branding note

The words “by MAAROOF AI” identify project authorship/ownership. They do not grant this utility access to MAAROOF AI infrastructure and must not be represented as a product integration.
