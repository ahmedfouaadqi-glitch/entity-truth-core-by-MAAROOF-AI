import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseEntityCsv } from "../dist/index.js";

test("CSV parser preserves quoted commas, escaped quotes and multiline descriptions",()=>{
  const csv='name,description,lang\n"Example, Iraq","Line one\nLine two with ""quoted text""",en\n';
  const parsed=parseEntityCsv(csv);
  assert.equal(parsed.rows.length,1);
  assert.equal(parsed.rows[0].rowNumber,2);
  assert.equal(parsed.rows[0].input.name,"Example, Iraq");
  assert.equal(parsed.rows[0].input.description,'Line one\nLine two with "quoted text"');
});

test("CSV parser maps supported business fields and pipe-separated lists",()=>{
  const csv='entityName,schemaType,lang,window,alternateName,servedMarkets,entityLanguages,officialProfiles,facts,streetAddress,addressLocality,addressCountry,contactEmail,contactPhone,contactType,contactLanguages,services,serviceType,openingHoursSpecification,faqItems\n'+
  'Example Clinic,LocalBusiness,ar,500,عيادة المثال|Example Clinic,Iraq|Jordan,ar|en,https://example.test|https://example.test/contact,Founded in 2020,1 Example Street,Baghdad,Iraq,hello@example.test,+00000000000,appointments,ar|en,Consultation|Testing,, "[{""dayOfWeek"":[""Monday""],""opens"":""09:00"",""closes"":""17:00""}]", "[{""question"":""What are your hours?"",""answer"":""09:00 to 17:00""}]"';
  const parsed=parseEntityCsv(csv);
  const row=parsed.rows[0];
  assert.ok(row.input);
  assert.equal(row.input.name,"Example Clinic");
  assert.equal(row.input.schemaType,"LocalBusiness");
  assert.equal(row.input.lang,"ar");
  assert.equal(row.input.window,500);
  assert.deepEqual(row.input.aliases,["عيادة المثال","Example Clinic"]);
  assert.deepEqual(row.input.markets,["Iraq","Jordan"]);
  assert.equal(row.input.address.addressCountry,"Iraq");
  assert.equal(row.input.contactPoints[0].email,"hello@example.test");
  assert.deepEqual(row.input.services,[{name:"Consultation"},{name:"Testing"}]);
  assert.equal(row.input.openingHours[0].opens,"09:00");
  assert.equal(row.input.faqs[0].question,"What are your hours?");
});

test("invalid CSV rows are reported independently and valid rows remain available",()=>{
  const parsed=parseEntityCsv("name,lang,window\nValid One,en,100\nMissing Name,ar,500\nInvalid Language,fr,100\nInvalid Window,en,250\n");
  assert.equal(parsed.rows.length,4);
  assert.ok(parsed.rows[0].input);
  assert.match(parsed.rows[1].error,/name is required/);
  assert.match(parsed.rows[2].error,/lang must be ar, ku, or en/);
  assert.match(parsed.rows[3].error,/window must be 100, 500, or full/);
});

test("CSV parser rejects duplicate, unknown and empty header names",()=>{
  assert.throws(()=>parseEntityCsv("name,entityName\nA,A\n"),/duplicate column headers/);
  assert.throws(()=>parseEntityCsv("name,unknownColumn\nA,B\n"),/Unsupported CSV columns/);
  assert.throws(()=>parseEntityCsv("name,,lang\nA,B,en\n"),/header names cannot be empty/);
});

test("CSV parser rejects malformed quote placement and unclosed quoted fields",()=>{
  assert.throws(()=>parseEntityCsv('name,description\nExample,un"closed\n'),/quote must start/);
  assert.throws(()=>parseEntityCsv('name,description\nExample,"not closed\n'),/opening quote was not closed/);
});

test("local CSV batch processes valid rows even when another row fails",()=>{
  const root=mkdtempSync(join(tmpdir(),"entity-truth-csv-batch-"));
  try{
    const csvPath=join(root,"entities.csv");
    const output=join(root,"output");
    writeFileSync(csvPath,'name,schemaType,lang,headText,description\nAlpha Clinic,LocalBusiness,en,"Founded in 2024","Local clinic"\nBroken Entity,fr,ar,"Text","Bad language"\nBeta Studio,Organization,ar,"تأسست عام ٢٠٢٠","استوديو"\n');
    assert.throws(()=>execFileSync(process.execPath,[
      resolve("dist/cli.js"),"--batch-csv",csvPath,"--out-dir",output,"--report","both","--json"
    ],{encoding:"utf8"}));
    const summaryPath=join(output,"batch-summary.json");
    assert.equal(existsSync(summaryPath),true);
    const summary=JSON.parse(readFileSync(summaryPath,"utf8"));
    assert.equal(summary.totalRows,3);
    assert.equal(summary.processedRows,2);
    assert.equal(summary.failedRows,1);
    assert.equal(summary.rows[0].status,"processed");
    assert.equal(summary.rows[1].status,"failed");
    assert.match(summary.rows[1].error,/lang must be/);
    assert.equal(summary.rows[2].status,"processed");
    const alphaDir=join(output,summary.rows[0].outputDirectory);
    const betaDir=join(output,summary.rows[2].outputDirectory);
    assert.equal(existsSync(join(alphaDir,"entity-report.md")),true);
    assert.equal(existsSync(join(alphaDir,"entity-report.html")),true);
    assert.equal(existsSync(join(betaDir,"organization.jsonld")),true);
    assert.throws(()=>execFileSync(process.execPath,[
      resolve("dist/cli.js"),"--batch-csv",csvPath,"--out-dir",output
    ]));
    execFileSync(process.execPath,[
      resolve("dist/cli.js"),"--batch-csv",csvPath,"--out-dir",output,"--force"
    ]);
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
});

test("CSV batch option requires its own output directory",()=>{
  assert.throws(()=>execFileSync(process.execPath,[
    resolve("dist/cli.js"),"--batch-csv","entities.csv"
  ]));
});
