# Deploying the playground on your own hosting account

The official repository does not host the playground for users. Each user deploys a copy or fork under their own GitHub, Cloudflare, Netlify or self-hosted account.

## Build the static site

From the repository root:

    npm install
    npm run build
    npm run prepare:pages

This creates _site/ containing the browser playground and compiled core. No backend, database, secret, hosted MAAROOF service or API key is required.

## GitHub Pages

1. Fork or copy this repository into the user's own GitHub account.
2. Copy deploy/templates/github-pages.yml to .github/workflows/deploy-pages.yml in that repository.
3. Open Settings → Pages and select GitHub Actions as the deployment source.
4. Push to main; the copied workflow builds and deploys _site/ within the user's account.

Do not enable this workflow in the official repository as a substitute for user-owned hosting.

## Cloudflare Pages

Connect the user's own GitHub repository to Cloudflare Pages and set:

- Build command: npm install --no-audit --no-fund && npm run build && npm run prepare:pages
- Build output directory: _site
- Environment variable: NODE_VERSION=22

See deploy/cloudflare-pages/README.md.

## Netlify

The repository includes a root netlify.toml so a user can connect their own fork or copy to a Netlify site without relying on MAAROOF AI hosting.

- Build command: npm install --no-audit --no-fund && npm run build && npm run prepare:pages
- Publish directory: _site
- Node version: 22

The same configuration template is also available at deploy/templates/netlify.toml.

## Self-hosting

Build _site/ and serve that directory from the user's own static web server. A static file server is sufficient; no application backend is required.

## Privacy

The page downloads the compiled core from the same static host. Entity analysis runs in the browser. This deployment does not add server-side collection, telemetry or a database.
