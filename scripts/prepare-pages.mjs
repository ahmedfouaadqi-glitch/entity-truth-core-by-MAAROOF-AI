import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "_site");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(root, "playground"), join(output, "playground"), { recursive: true });
await cp(join(root, "dist"), join(output, "dist"), { recursive: true });

await writeFile(
  join(output, "index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./playground/"><title>Entity Truth Core</title><a href="./playground/">Open Entity Truth Core</a></html>\n`,
  "utf8",
);
console.log("Prepared user-owned static site in _site/.");
