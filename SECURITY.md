# Security Policy

## Data handling

Entity Truth Core is designed for local-first operation:

- The core does not make network requests or fetch websites.
- The browser playground processes entity data in the browser and imports the compiled core from the same static host.
- The MCP server uses local stdio and does not start an HTTP listener.
- No entity data is transmitted to MAAROOF AI, stored in a central database or collected through telemetry by this project.
- No account, API key or project secret is required for core functions.

Installing dependencies or deploying the optional static site may require the user's own package registry and hosting account. That infrastructure is controlled by the user.

## Scope and limitations

The software does not verify company facts, URLs, ownership, trademarks or public profiles. Treat generated JSON-LD and text files as drafts. The JSON-LD validator checks only a limited structural subset and is not a complete Schema.org conformance validator.

## Reporting

Do not post credentials, private entity data or unpatched exploit details in public issues. Use GitHub's private vulnerability reporting feature for this repository if it is enabled; otherwise contact the repository owner through a private channel before public disclosure.
