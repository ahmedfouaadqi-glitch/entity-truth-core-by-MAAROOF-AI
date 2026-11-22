## Change summary

Describe the specific local preparation capability changed.

## Scope and architecture

- [ ] The change uses user-supplied or local input only.
- [ ] It adds no outbound network request, crawling or external verification.
- [ ] It adds no MAAROOF AI production API, model, tool, orchestration, database or secret dependency.
- [ ] It adds no AI visibility, SEO/GEO/AEO measurement, competitor analysis or strategy capability.
- [ ] It preserves the tool's “prepares, does not investigate” boundary.

## Validation

- [ ] `npm ci` completed successfully.
- [ ] `npm test` completed successfully.
- [ ] Node.js 20 and 22 CI checks pass.
- [ ] Tests cover relevant Arabic, Sorani Kurdish and English cases.
- [ ] CLI, MCP and browser behavior remain consistent where applicable.
- [ ] Skill copies remain identical if changed.

## Risk and compatibility

List any public API or report-schema changes. Confirm the default scan window remains 100 unless this PR explicitly addresses a versioned breaking change.
