# Agent and MCP integrations

Entity Truth Core uses one deterministic TypeScript core. Codex, Claude Code and other compatible clients call the same local MCP process; the skill provides the usage policy and interpretation rules.

## 1. Build locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run build
```

The MCP entry point is `dist/mcp/server.js`. It uses stdio and does not open a network port. Entity scans accept the optional `window` value `100`, `500`, or `full`; the default is `100`.

## 2. OpenAI Codex

Codex discovers repository skills under `.agents/skills/` and user skills under `~/.agents/skills/`. This repository includes:

```text
.agents/skills/entity-truth-core/SKILL.md
```

To register the local MCP server for the current Codex user, add the following to `~/.codex/config.toml` and replace the example path with the absolute path to this checkout:

```toml
[mcp_servers.entity_truth_core]
command = "node"
args = ["/ABSOLUTE/PATH/entity-truth-core-by-MAAROOF-AI/dist/mcp/server.js"]
```

Restart or reload Codex if the server does not appear in its MCP tools list.

## 3. Claude Code

Claude Code discovers project skills under `.claude/skills/` and user skills under `~/.claude/skills/`. This repository includes:

```text
.claude/skills/entity-truth-core/SKILL.md
```

Register the MCP server from a terminal in Claude Code's environment (replace the path):

```bash
claude mcp add --transport stdio entity-truth-core -- node "/ABSOLUTE/PATH/entity-truth-core-by-MAAROOF-AI/dist/mcp/server.js"
```

Check the configured server with `claude mcp list`. The server command must point to the built `dist/mcp/server.js`, not the TypeScript source.

## 4. Claude Desktop and other MCP clients

Clients that support local stdio MCP servers can use this generic configuration shape. Each client may store it in a different settings file:

```json
{
  "mcpServers": {
    "entity-truth-core": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/entity-truth-core-by-MAAROOF-AI/dist/mcp/server.js"
      ]
    }
  }
}
```

Other agents can use the same server if they support MCP stdio. Agent Skills can be reused where the agent implements the Agent Skills folder format; the discovery directory can differ by product.

A language model without an agent runtime, MCP client, filesystem access, or command execution cannot invoke local tools by itself. Compatibility therefore depends on the host application, not just the model name.

## 5. Exposed tools

| MCP tool | Purpose |
|---|---|
| `entity_scan` | Full local audit and draft generation |
| `entity_name_hint` | Limited static name heuristic |
| `entity_profile_generate` | Draft Organization JSON-LD and llms.txt-style text |
| `entity_profile_validate` | Limited local structural check of Organization JSON-LD |

The `entity_scan` tool accepts `window: 100`, `window: 500`, or `window: "full"`. The local scanner can surface candidate years, percentages, standards, scale, currencies, email addresses, formatted/labelled phone numbers, labelled addresses and labelled service lists. These are not validated. All inputs are processed locally. The server does not implement remote HTTP transport in this release.

## 6. User-level skill installation

Copy the canonical `skills/entity-truth-core/` directory into the relevant user-level skills folder supported by the target agent. Do not copy the same skill to multiple discovery locations with conflicting content.

The copies in `.agents/skills/` and `.claude/skills/` are tested against the canonical file to prevent instruction drift.
