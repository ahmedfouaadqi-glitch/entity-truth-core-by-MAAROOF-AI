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


## Supported versions

Security reports are accepted for the latest code on the repository's default branch (`main`). Older releases and forks may not receive security fixes.

## Reporting a vulnerability

Please do not publish suspected vulnerabilities, exploit details, credentials, private data, or proof-of-concept payloads in a public issue or discussion.

1. If GitHub's **Report a vulnerability** option is visible in the repository's Security tab, use that private reporting path and include the affected commit, impact, and minimal reproduction details.
2. If the private reporting option is not available, contact the repository owner privately through GitHub before sharing sensitive technical details. Do not place the details in a public issue.

Private vulnerability reporting is a repository setting. The presence of this file does not mean that the setting has been enabled. The repository owner must enable it under **Repository Settings → Security and quality → Advanced Security → Private vulnerability reporting**, where available, and verify that the **Report a vulnerability** option appears under the repository's Advisories section.

## Scope

Reports about the Entity Truth Core runtime, CLI, MCP stdio server, browser playground, report generation, CSV parsing, dependencies, and repository workflows are in scope.

Do not include real customer entity data, live credentials, access tokens, or personal data in a report. Use synthetic examples.

## Response expectations

The repository owner will assess reports, determine affected versions, and coordinate a fix or mitigation. No response-time guarantee is made by this policy.
