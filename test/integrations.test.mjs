import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  executeEntityNameHint,
  executeEntityProfileGenerate,
  executeEntityProfileValidate,
  executeEntityScan,
} from "../dist/mcp/tools.js";
import { validateEntityProfile } from "../dist/validator.js";

test("MCP entity_scan delegates to the shared core", () => {
  const result = executeEntityScan({
    name: "Example Organization",
    headText: "Founded in 2018, serving 4 countries with ISO 9001.",
    lang: "en",
  });
  assert.equal(result.entity, "Example Organization");
  assert.equal(result.factDensity.method, "heuristic-pattern-scan");
  assert.ok(result.factDensity.candidateSignalCount >= 2);
  assert.match(result.scopeNotice.join(" "), /no network requests/i);
});

test("MCP entity_name_hint remains a limited static heuristic", () => {
  const result = executeEntityNameHint({ name: "معروف", lang: "ar" });
  assert.equal(result.heuristicRisk, "high");
  assert.equal(result.lexiconCoverage, "limited-static-lexicon");
  assert.match(result.limitations.join(" "), /global entity search/i);
});

test("MCP profile generation uses only supplied values", () => {
  const result = executeEntityProfileGenerate({ name: "Example Organization" });
  assert.equal(result.jsonLd.name, "Example Organization");
  assert.equal("areaServed" in result.jsonLd, false);
  assert.match(result.llmsTxt, /not independent verification/i);
});

test("JSON-LD validator accepts the generator's supported Organization subset", () => {
  const pack = executeEntityProfileGenerate({
    name: "Example Organization",
    url: "https://example.org",
    markets: ["Iraq"],
    knowsLanguages: ["ar", "en"],
  });
  const validation = validateEntityProfile(pack.jsonLd);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
  assert.equal(validation.scope, "local-structural-check");
});

test("JSON-LD validator rejects invalid structure and unsafe URLs", () => {
  const validation = executeEntityProfileValidate({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Example",
    url: "javascript:alert(1)",
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((item) => item.code === "invalid_url"));
});

test("Codex and Claude skills are byte-identical to the canonical skill", async () => {
  const paths = [
    "skills/entity-truth-core/SKILL.md",
    ".agents/skills/entity-truth-core/SKILL.md",
    ".claude/skills/entity-truth-core/SKILL.md",
  ];
  const contents = await Promise.all(paths.map((path) => readFile(new URL("../" + path, import.meta.url), "utf8")));
  assert.ok(contents.every((content) => content === contents[0]));
});

test("browser playground consumes the shared TypeScript build instead of duplicating scanner rules", async () => {
  const html = await readFile(new URL("../playground/index.html", import.meta.url), "utf8");
  assert.match(html, /type="module"/);
  assert.match(html, /import\s*\{\s*auditEntity\s*\}\s*from\s*["']\.\.\/dist\/index\.js["']/);
  assert.doesNotMatch(html, /function\s+(?:scan|first100)\s*\(/);
  assert.doesNotMatch(html, /const\s+COMMON_TERMS\s*=/);
});


test("MCP scan wrapper forwards the selected local analysis window", () => {
  const text = [...Array(100).fill("word"), "2024"].join(" ");
  const result = executeEntityScan({ name: "Example", headText: text, lang: "en", window: 500 });
  assert.equal(result.factDensity.window, 500);
  assert.ok(result.factDensity.candidateSignals.some((signal) => signal.category === "year"));
});


test("browser playground exposes the same 100, 500 and full scan windows", async () => {
  const html = await readFile(new URL("../playground/index.html", import.meta.url), "utf8");
  assert.match(html, /<select id="window">/);
  assert.match(html, /option value="100"/);
  assert.match(html, /option value="500"/);
  assert.match(html, /option value="full"/);
  assert.match(html, /window:\s*\$\("window"\)/);
});
