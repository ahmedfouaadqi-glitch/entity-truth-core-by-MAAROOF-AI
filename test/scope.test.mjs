import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimeFiles = [
  "src/index.ts",
  "src/scanner.ts",
  "src/pack-generator.ts",
  "src/validator.ts",
  "src/cli.ts",
  "src/mcp/server.ts",
  "src/mcp/tools.ts",
  "playground/index.html",
];

test("product scope policy is present and explicitly excludes verification", async () => {
  const scope = await readFile(new URL("../docs/PRODUCT_SCOPE.md", import.meta.url), "utf8");
  assert.match(scope, /prepares; it does not investigate or verify/i);
  assert.match(scope, /external-verification proposal.*removed/i);
  assert.match(scope, /MAAROOF AI production/i);
});

test("runtime source contains no outbound network clients or browser network APIs", async () => {
  const sources = await Promise.all(
    runtimeFiles.map((path) => readFile(new URL("../" + path, import.meta.url), "utf8")),
  );
  const combined = sources.join("\n");
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /\baxios\b|\bundici\b|XMLHttpRequest|WebSocket|sendBeacon/);
  assert.doesNotMatch(combined, /from\s+["']node:(?:http|https)["']/);
});

test("runtime dependencies do not add MAAROOF AI or model-provider SDKs", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const dependencies = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const forbidden = dependencies.filter((name) =>
    /^(?:openai|@anthropic-ai\/|@google\/(?:genai|generative-ai)|@maaroof\/)/i.test(name),
  );
  assert.deepEqual(forbidden, []);
});


test("browser playground does not imply a MAAROOF AI runtime integration", async () => {
  const html = await readFile(new URL("../playground/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /href=["']https?:\/\/maaroofai\.com/i);
  assert.match(html, /independent local utility|أداة مستقلة ومحلية|سەربەخۆ و ناوخۆیی/u);
});
