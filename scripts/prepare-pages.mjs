import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const root = process.cwd();
const output = new URL("../_site/", `file://${root}/`).pathname;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("../playground/", `file://${root}/`), new URL("playground/", `file://${output}`), { recursive: true });
await cp(new URL("../dist/", `file://${root}/`), new URL("dist/", `file://${output}`), { recursive: true });

await writeFile(
  new URL("index.html", `file://${output}`),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./playground/"><title>Entity Truth Core</title><a href="./playground/">Open Entity Truth Core</a></html>\n`,
  "utf8",
);
console.log("Prepared user-owned static site in _site/.");
