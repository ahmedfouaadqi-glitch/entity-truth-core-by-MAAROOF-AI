# Local CSV batch input

Entity Truth Core processes a UTF-8 CSV file locally. Each data row is converted into an independent `EntityInput`, audited through the same deterministic core, and written to its own output directory. A row-level error does not stop valid rows from being processed.

## Run

Build the project first, then run:

    node dist/cli.js --batch-csv ./entities.csv --out-dir ./batch-output --report both

The output directory contains `batch-summary.json` and one directory per input row. Each successful row directory contains:

- `audit-report.json`
- `organization.jsonld`
- `llms.txt`
- `entity-report.md` and/or `entity-report.html` when requested

Directories are prefixed with the CSV physical row number, so duplicate entity names still produce separate output directories. If one or more rows fail, the CLI still writes the summary and successful rows, then returns a non-zero exit code. This makes partial success visible to scripts instead of hiding row errors.

Existing outputs are not overwritten by default. Pass `--force` to replace the batch summary and row outputs. The command does not delete unrelated files from the output directory.

## Supported columns

Column names are case-insensitive. Spaces, hyphens and underscores are ignored when matching headers. The `name` column is required. `entityName` and `companyName` are accepted aliases for it; `website` and `websiteUrl` are aliases for `url`; `alternateName`, `servedMarkets`, `entityLanguages`, `openingHoursSpecification`, `serviceList` and `faqItems` are also accepted aliases.

| Column | Meaning |
|---|---|
| `name` | Required entity name |
| `schemaType` | `Organization`, `LocalBusiness`, `ProfessionalService` (legacy/deprecated), or `Service` |
| `url` | User-supplied HTTP(S) website URL; never fetched |
| `description` | User-supplied description |
| `headText` | Supplied text for local candidate scanning |
| `lang` | `ar`, `ku`, or `en` |
| `window` | `100`, `500`, or `full` |
| `aliases` | Alternate names separated by `|` |
| `markets` | User-supplied markets separated by `|` |
| `knowsLanguages` | Entity languages separated by `|` |
| `officialProfiles` | User-supplied profile URLs separated by `|`; ownership is not checked |
| `facts` | User-supplied fact statements separated by `|` |
| `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry` | Explicit address fields |
| `contactType`, `contactEmail`, `contactPhone`, `contactLanguages` | Explicit contact values |
| `services` | User-supplied service names separated by `|` |
| `serviceType` | Primary type for a `Service` profile |
| `openingHours` | JSON array of opening-hours objects |
| `faqs` | JSON array of user-written question / answer objects |

Unknown column headers and duplicate headers are rejected. This prevents spelling mistakes from being silently dropped. Missing values remain absent; the parser does not infer or fill profile facts.

## Example

    name,schemaType,lang,window,description,markets,addressLocality,addressCountry,contactEmail,services
    "Example Clinic",LocalBusiness,en,500,"Local health practice",Iraq|Jordan,Baghdad,Iraq,hello@example.test,Consultation|Testing
    "Example Studio",Organization,ar,100,"Creative studio",Iraq,Basra,Iraq,contact@example.test,Brand design|Web design

Lists use a vertical bar (`|`) as the separator so commas can remain inside ordinary CSV values. Quote CSV cells according to standard CSV quoting rules when they contain commas, quotes or line breaks. Opening hours and FAQs are JSON arrays inside quoted CSV cells, for example:

- `openingHours`: `[{"dayOfWeek":["Monday"],"opens":"09:00","closes":"17:00"}]`
- `faqs`: `[{"question":"What are your hours?","answer":"Monday to Friday"}]`

The parser validates the structure of these two JSON columns for each row. Row-level parse errors are written to `batch-summary.json` and do not stop other rows.

## Locality and limits

- The CSV file is read from the local filesystem and is not uploaded.
- Every row is processed independently; there is no cross-row lookup, deduplication, ranking or comparison.
- No network requests, crawling, external fact checking, AI model calls or MAAROOF AI production services are used.
- The input is UTF-8 CSV. Direct `.xlsx` / Excel workbook parsing is not included in this release.
- The command does not infer official status, ownership, address, business hours, contact reachability or service validity.
