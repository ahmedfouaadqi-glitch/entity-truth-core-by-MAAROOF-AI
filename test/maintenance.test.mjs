import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Dependabot configuration covers npm and GitHub Actions on a weekly schedule",async()=>{
  const config=await readFile(new URL("../.github/dependabot.yml",import.meta.url),"utf8");
  assert.match(config,/^version:\s*2/m);
  assert.match(config,/package-ecosystem:\s*npm/);
  assert.match(config,/package-ecosystem:\s*github-actions/);
  assert.equal((config.match(/interval:\s*weekly/g)||[]).length,2);
  assert.equal((config.match(/directory:\s*\//g)||[]).length,2);
});

test("security policy distinguishes reporting guidance from enabled repository settings",async()=>{
  const policy=await readFile(new URL("../SECURITY.md",import.meta.url),"utf8");
  assert.match(policy,/do not publish.*public issue/i);
  assert.match(policy,/presence of this file does not mean that the setting has been enabled/i);
  assert.match(policy,/Settings.*Private vulnerability reporting/i);
});

test("release process requires merged main, CI, protected tags and owner publication decision",async()=>{
  const release=await readFile(new URL("../docs/RELEASE_PROCESS.md",import.meta.url),"utf8");
  assert.match(release,/official.*main.*branch/i);
  assert.match(release,/Node.js 20 and 22/);
  assert.match(release,/official.*tag ruleset are Active/i);
  assert.match(release,/separate owner decision/i);
  assert.match(release,/unmerged branch/i);
});

test("ownership documentation does not claim security settings are already enabled",async()=>{
  const ownership=await readFile(new URL("../docs/REPOSITORY_OWNERSHIP.md",import.meta.url),"utf8");
  assert.match(ownership,/not verified those settings/i);
  assert.match(ownership,/Private vulnerability reporting enabled and verified/);
  assert.match(ownership,/Dependabot weekly version updates observed after/);
});


test("Sorani quickstart documents local use and the no-network boundary",async()=>{
  const guide=await readFile(new URL("../docs/QUICKSTART.ku.md",import.meta.url),"utf8");
  assert.match(guide,/ئامرازێکی سەربەخۆ و ناوخۆییە/);
  assert.match(guide,/--batch-csv/);
  assert.match(guide,/هیچ وێبسایتێک ناگەڕێت/);
});
