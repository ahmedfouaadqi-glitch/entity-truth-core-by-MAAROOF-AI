---
name: entity-truth-core
description: Prepare user-supplied entity profiles locally, scan selectable text windows for candidate patterns, generate draft Schema.org Organization, LocalBusiness, ProfessionalService or Service JSON-LD and structurally validate the supported subset. Does not research or verify external facts.
---

# Entity Truth Core

Use this skill only to prepare a machine-readable entity profile from information supplied by the user. The tool is not a research engine, crawler, fact checker, trademark search, ranking system, or AI-visibility measurement service.

## Non-negotiable product boundaries

1. Process supplied text and fields locally. Do not browse, fetch websites, crawl sources, query registries, or compare inputs with external data.
2. Do not add an external verification mode, even as an opt-in feature, to this project.
3. Do not call MAAROOF AI production APIs, models, tools, orchestration, databases, credentials, or hosted services.
4. Do not add AI model calls, search/GEO/SEO/AEO measurement, competitor analysis, market research, strategic recommendations, monitoring, or prediction.
5. Treat all detected patterns and user-supplied facts, URLs, markets, addresses, contact details, opening hours, service descriptions and FAQs as unverified input. Do not imply that URL syntax proves ownership.
6. Keep outputs as drafts. A local structural check is not proof of factual accuracy or complete Schema.org conformance.

## Before using the tool

1. Confirm the entity name and use only details supplied by the user or explicitly authorized local input.
2. Do not infer worldwide coverage, served markets, entity languages, official profiles, awards, certifications, dates, metrics, legal status, addresses, contacts, hours, or services.
3. Keep user-provided claims labelled as user-provided and unverified.
4. Prefer the MCP tools when the Entity Truth Core MCP server is configured.
5. If MCP is unavailable, use the local CLI only when the package is installed in the user's environment.

## Available MCP tools

- `entity_scan`: run the complete local audit, including the selectable 100-word, 500-word, or full-text candidate scan, limited name hint, and draft profile.
- `entity_name_hint`: run the small static word-list heuristic for Arabic, Sorani Kurdish, or English.
- `entity_profile_generate`: generate draft Schema.org JSON-LD and llms.txt-style text from supplied fields.
- `entity_profile_validate`: perform a limited structural check of the supported JSON-LD subset.

## Supported local profile types and fields

The primary `schemaType` values are:

- `Organization` (default)
- `LocalBusiness`
- `ProfessionalService` (legacy input only; deprecated in Schema.org—prefer `LocalBusiness` for a local provider or `Service` for a service description).
- `Service`

Optional nested fields accepted by `entity_scan` and `entity_profile_generate` are:

- `address`: a user-supplied PostalAddress with `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, and/or `addressCountry`.
- `contactPoints`: user-supplied ContactPoint records with `contactType`, `telephone`, `email`, and `availableLanguage`.
- `openingHours`: OpeningHoursSpecification records with English weekday names and 24-hour `opens` / `closes` values; the generator emits canonical `https://schema.org/Weekday` identifiers. Optional validity dates use YYYY-MM-DD.
- `services`: user-supplied service names and optional descriptions or service types, emitted as OfferCatalog entries.
- `faqs`: user-written question / answer pairs, emitted as a nested FAQPage.
- `serviceType`: the service classification for a primary `Service` profile.

Only supply these fields where the values are explicitly provided by the user. Do not derive addresses, official contacts, opening hours or services from a website, inferred location, pattern matches, or memory. The local validator checks only the fields and structures supported by this project. It does not check whether an address exists, a phone can be reached, an email is delivered, a business is open, a service is available, or an FAQ answer is true.

The scanner may surface candidate years, percentages, standards, scale values, currencies, email addresses, formatted or labelled phone numbers, labelled addresses, and labelled service lists. These are extracted text patterns only. They are not checked for correctness, current status, ownership, or official status.

Pass `window` as `100`, `500`, or `"full"`; the default is `100`. Pass `lang` as `ar`, `ku`, or `en`. Pass `markets`, `knowsLanguages`, `aliases`, `officialProfiles`, `facts`, and the schema fields only when the user has supplied them. Do not add empty or invented values.

## Interpreting results

- Candidate patterns are not verified facts.
- A name hint is based on a small static lexicon; it does not establish global uniqueness or prove a collision.
- Email and phone patterns do not prove reachability or ownership.
- Labelled addresses and service text are not independently validated.
- The structural validator returns precise local field paths for the supported subset and English / Arabic messages; it is not full Schema.org validation.
- Valid URL syntax does not establish link ownership or official status.
- Generated JSON-LD and llms.txt-style text are drafts and must be reviewed before publication.
- Never describe the score as a search ranking factor, GEO score, AI citation score, or model visibility score.

## Local CLI fallback

From a local checkout, build the project and run:

```bash
npm ci
npm run build
node dist/cli.js "Example Organization" --text "User-supplied opening text" --lang en --window 500 --out-dir ./entity-profile
```

For a local business, the CLI also accepts `--type LocalBusiness`, address flags such as `--city` and `--country`, `--email`, `--phone`, `--service`, `--hours` with a JSON object, and `--faq "Question::Answer"`. Complex nested data can be supplied using the local `--input` JSON file. Choose `--window 100`, `--window 500`, or `--window full`. The default is `100`. The CLI writes local files only. Use `--report md`, `--report html`, or `--report both` with `--out-dir` to export a local report in Arabic, Sorani Kurdish or English; it contains the selected scan window, candidate patterns, field inventory, warnings and generated draft files. The HTML report is self-contained and works offline. Use `--batch-csv ./entities.csv --out-dir ./batch-output --report both` to process independent rows from a local UTF-8 CSV. Lists use `|`; opening hours and FAQs use JSON arrays. Invalid rows are isolated, successful rows still export, and `batch-summary.json` records row-level outcomes. Direct XLSX input is not supported. It refuses to overwrite existing output unless the user explicitly supplies `--force`.

## Privacy and boundaries

The MCP server uses local standard input/output (stdio). It does not start an HTTP listener, call a hosted MAAROOF AI service, access credentials, fetch websites, or transmit entity data. Do not expose user data to another service as part of this skill.

This utility prepares. It does not investigate. Do not use it as a substitute for external source verification, research, competitor analysis, strategy, or continuous monitoring; those functions are outside this project's scope.
