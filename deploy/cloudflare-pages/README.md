# Cloudflare Pages (user-owned project)

Create a Cloudflare Pages project connected to the user's own GitHub repository.

Build settings:

- Framework preset: None
- Build command: `npm install --no-audit --no-fund && npm run build && npm run prepare:pages`
- Build output directory: `_site`
- Environment variable: `NODE_VERSION=22`

The project is static. No Worker, database, environment secret, API key or MAAROOF AI hosting account is needed.
