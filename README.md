# Entity Truth Core by MAAROOF AI

A small, local-first helper that checks a short entity profile and prepares two draft files: Schema.org Organization JSON-LD and an `llms.txt`-style profile.

## What it does

1. Scans the first 100 words of supplied text for candidate numbers, dates, currencies and standards.
2. Shows simple name hints using a small built-in Arabic, Sorani Kurdish and English word list.
3. Generates draft machine-readable profile files from information supplied by the user.

## What it deliberately does not do

- It does not search the web or crawl company websites.
- It does not verify facts, trademark ownership or official social profiles.
- It does not query AI models or measure SEO, GEO, AI recommendations or citations.
- It does not analyse competitors or create an optimization strategy.
- It does not connect to MAAROOF AI's production platform, models, tools, skills, orchestration, databases or credentials.
- It does not infer Worldwide coverage or claim that an entity is verified.

This is an intentionally small helper, not a replacement for MAAROOF AI's research, intelligence, strategy or agency services. Signals and scores are heuristics, not truth or visibility measurements.

## Requirements

Node.js 20 or newer.

## Install and test

```bash
npm install
npm test
npm run build
```

## Use the CLI

```bash
npx tsc -p tsconfig.json
node dist/cli.js "Example Company" --text "Founded in 2018, ISO 9001 certified." --lang en --out-dir ./entity-profile
```

Or pass a JSON file:

```json
{
  "name": "Example Company",
  "url": "https://example.com",
  "description": "A short company description supplied by its owner.",
  "headText": "Founded in 2018 and serving 4 countries.",
  "markets": ["Iraq", "Germany"],
  "knowsLanguages": ["en", "ar"],
  "lang": "en"
}
```

```bash
node dist/cli.js --input ./entity.json --json
```

The output directory contains `audit-report.json`, `organization.jsonld` and `llms.txt`. Existing files are not overwritten unless `--force` is supplied.

## Supported tool languages

- Arabic (`ar`)
- Sorani Kurdish (`ku`)
- English (`en`)

Language support is limited to the built-in heuristics and output. It is not comprehensive NLP.

## Privacy

All analysis runs locally. The package makes no network requests and sends no input to a remote service.

## License

MIT.
