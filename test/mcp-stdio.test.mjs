import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

test("MCP stdio server completes handshake, lists tools and serves an audit", async () => {
  const client = new Client(
    { name: "entity-truth-core-integration-test", version: "1.0.0" },
    { versionNegotiation: { mode: "legacy" } },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("dist/mcp/server.js")],
  });

  try {
    await client.connect(transport);
    const listing = await client.listTools();
    const names = listing.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, [
      "entity_name_hint",
      "entity_profile_generate",
      "entity_profile_validate",
      "entity_scan",
    ]);

    const response = await client.callTool({
      name: "entity_scan",
      arguments: {
        name: "Example Organization",
        headText: "Founded in 2018, ISO 9001 and serving 4 countries.",
        lang: "en",
      },
    });
    assert.notEqual(response.isError, true);
    assert.equal(response.content[0].type, "text");
    const result = JSON.parse(response.content[0].text);
    assert.equal(result.entity, "Example Organization");
    assert.ok(result.factDensity.candidateSignalCount >= 2);
  } finally {
    await client.close();
  }
});
