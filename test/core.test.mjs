import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { auditEntity, calculateFactDensity, checkDisambiguation, generateMachinePack } from "../dist/index.js";
import { entityTextCorpus } from "./fixtures/entity-text-corpus.mjs";

test("scans no more than first 100 lexical words",()=>{const first=Array.from({length:100},(_,i)=>"word"+i).join(" ");const r=calculateFactDensity(first+" 2024 88%","en");assert.equal(r.totalWordsAnalyzed,100);assert.equal(r.candidateSignalCount,0);});
test("detects candidate signals in English",()=>{const r=calculateFactDensity("Founded in 2018, 35% growth, ISO 9001, serving 4 countries and USD 2500.","en");assert.ok(r.candidateSignalCount>=4);});
test("detects candidate signals in Arabic",()=>{const r=calculateFactDensity("تأسست عام 2020 وتخدم 5 دول ونمو 25% ومعيار ISO 9001","ar");assert.ok(r.candidateSignalCount>=3);});
test("detects candidate signals in Sorani Kurdish",()=>{const r=calculateFactDensity("لە ساڵی 2022 دامەزراوە و 5 وڵات و 20% گەشە","ku");assert.ok(r.candidateSignalCount>=2);});
test("de-duplicates repeated patterns",()=>{const r=calculateFactDensity("2018 2018 2018 40% 40%","en");assert.equal(r.candidateSignals.filter(x=>x.category==="year").length,1);assert.equal(r.candidateSignals.filter(x=>x.category==="percentage").length,1);});
test("name hints explicitly use a limited lexicon",()=>{const r=checkDisambiguation("معروف","ar");assert.equal(r.heuristicRisk,"high");assert.equal(r.lexiconCoverage,"limited-static-lexicon");});
test("short names are flagged as a heuristic only",()=>{assert.equal(checkDisambiguation("ABC","en").heuristicRisk,"medium");});
test("audit rejects missing names and unsupported languages",()=>{assert.throws(()=>auditEntity({name:" "}),/Entity name is required/);assert.throws(()=>auditEntity({name:"Example",lang:"fr"}),/Unsupported language/);});
test("does not invent Worldwide coverage",()=>{const r=generateMachinePack({name:"Example"});assert.equal("areaServed" in r.jsonLd,false);assert.match(r.warnings.join(" "),/Worldwide coverage is not assumed/);});
test("rejects unsafe website URLs",()=>{const r=generateMachinePack({name:"Example",url:"javascript:alert(1)"});assert.equal("url" in r.jsonLd,false);});
test("labels user facts as unverified",()=>{const r=generateMachinePack({name:"Example",facts:["Founded in 2010"]});assert.match(r.llmsTxt,/not independently verified/);});
test("preserves explicit markets and language without assumptions",()=>{const r=generateMachinePack({name:"Example",markets:["Iraq"],knowsLanguages:["ar","en"]});assert.deepEqual(r.jsonLd.knowsLanguage,["ar","en"]);assert.equal(Array.isArray(r.jsonLd.areaServed),true);});
test("CLI exports three files and refuses overwrite by default",()=>{const d=mkdtempSync(join(tmpdir(),"entity-truth-"));try{const args=[resolve("dist/cli.js"),"Example Entity","--out-dir",d];execFileSync(process.execPath,args);assert.ok(existsSync(join(d,"audit-report.json")));assert.ok(existsSync(join(d,"organization.jsonld")));assert.ok(existsSync(join(d,"llms.txt")));assert.throws(()=>execFileSync(process.execPath,args),/Refusing to overwrite/);execFileSync(process.execPath,[...args,"--force"]);}finally{rmSync(d,{recursive:true,force:true});}});
test("CLI reads JSON input preserving Arabic language",()=>{const d=mkdtempSync(join(tmpdir(),"entity-truth-json-"));try{const f=join(d,"entity.json");writeFileSync(f,JSON.stringify({name:"شركة المثال",headText:"تأسست عام 2020",lang:"ar"}));const out=execFileSync(process.execPath,[resolve("dist/cli.js"),"--input",f,"--json"],{encoding:"utf8"});assert.equal(JSON.parse(out).language,"ar");}finally{rmSync(d,{recursive:true,force:true});}});


test("default analysis window remains exactly 100 lexical words",()=>{
  const text=[...Array(100).fill("word"),"2024"].join(" ");
  const report=calculateFactDensity(text,"en");
  assert.equal(report.window,100);
  assert.equal(report.maxWords,100);
  assert.equal(report.totalWordsAnalyzed,100);
  assert.equal(report.candidateSignalCount,0);
});

test("500-word window includes candidate patterns after the default boundary",()=>{
  const text=[...Array(100).fill("word"),"2024"].join(" ");
  const report=calculateFactDensity(text,"en",500);
  assert.equal(report.window,500);
  assert.equal(report.maxWords,500);
  assert.equal(report.totalWordsAnalyzed,101);
  assert.ok(report.candidateSignals.some(signal=>signal.category==="year"));
});

test("full window scans all supplied text and reports the effective word count",()=>{
  const text=[...Array(500).fill("word"),"2024","more","text"].join(" ");
  const report=calculateFactDensity(text,"en","full");
  assert.equal(report.window,"full");
  assert.equal(report.maxWords,503);
  assert.equal(report.totalWordsAnalyzed,503);
  assert.ok(report.candidateSignals.some(signal=>signal.category==="year"));
  assert.match(report.limitations.join(" "),/All lexical words/);
});

test("analysis window rejects unsupported values",()=>{
  assert.throws(()=>calculateFactDensity("Example text","en",250),/Analysis window must be 100, 500, or full/);
});

test("auditEntity forwards an explicit analysis window",()=>{
  const text=[...Array(100).fill("word"),"2024"].join(" ");
  const report=auditEntity({name:"Example",headText:text,window:500});
  assert.equal(report.factDensity.window,500);
  assert.ok(report.factDensity.candidateSignals.some(signal=>signal.category==="year"));
});

test("CLI accepts --window 500 and reports the selected window",()=>{
  const text=[...Array(100).fill("word"),"2024"].join(" ");
  const out=execFileSync(process.execPath,[resolve("dist/cli.js"),"Example","--text",text,"--window","500","--json"],{encoding:"utf8"});
  const report=JSON.parse(out);
  assert.equal(report.factDensity.window,500);
  assert.ok(report.factDensity.candidateSignals.some(signal=>signal.category==="year"));
});

test("CLI accepts --window full and rejects unsupported windows",()=>{
  const text=[...Array(500).fill("word"),"2024"].join(" ");
  const out=execFileSync(process.execPath,[resolve("dist/cli.js"),"Example","--text",text,"--window","full","--json"],{encoding:"utf8"});
  assert.equal(JSON.parse(out).factDensity.window,"full");
  assert.throws(()=>execFileSync(process.execPath,[resolve("dist/cli.js"),"Example","--window","250","--json"]));
});


test("normalizes Arabic-Indic digits for detection while preserving original candidate text",()=>{
  const text="تأسست عام ٢٠٢٠، ونموها ٢٥٪، وتخدم ٥ دول.";
  const report=calculateFactDensity(text,"ar","full");
  const year=report.candidateSignals.find(signal=>signal.category==="year");
  const percentage=report.candidateSignals.find(signal=>signal.category==="percentage");
  const scale=report.candidateSignals.find(signal=>signal.category==="scale");
  assert.equal(year?.value,"٢٠٢٠");
  assert.equal(percentage?.value,"٢٥٪");
  assert.equal(scale?.value,"٥ دول");
});

test("normalizes Persian digits and Arabic decimal and thousands separators",()=>{
  const text="الإيرادات ۱۲٫۵٪ والمبلغ ۱۲٬۵۰۰ د.ع";
  const report=calculateFactDensity(text,"ar","full");
  assert.ok(report.candidateSignals.some(signal=>signal.category==="percentage"&&signal.value==="۱۲٫۵٪"));
  assert.ok(report.candidateSignals.some(signal=>signal.category==="currency"&&signal.value==="۱۲٬۵۰۰ د.ع"));
});

test("removes Arabic diacritics and tatweel for matching without rewriting source values",()=>{
  const text="تَأْسَّسَت عـام ٢٠٢٠ وتخدم ٥ دُوَل بنسبة ٢٥٪";
  const report=calculateFactDensity(text,"ar","full");
  assert.ok(report.candidateSignals.some(signal=>signal.category==="year"&&signal.value==="٢٠٢٠"));
  assert.ok(report.candidateSignals.some(signal=>signal.category==="scale"&&signal.value.includes("٥")));
  assert.ok(report.candidateSignals.some(signal=>signal.category==="percentage"&&signal.value==="٢٥٪"));
});

test("normalizes common Arabic alef forms for local name hints",()=>{
  const plain=checkDisambiguation("أصيل","ar");
  const marked=checkDisambiguation("أَصِيل","ar");
  assert.equal(plain.heuristicRisk,"high");
  assert.equal(marked.heuristicRisk,"high");
  assert.equal(marked.normalizedName,plain.normalizedName);
});

test("preserves the supplied source string when normalizing pattern matches",()=>{
  const text="٢٠٢٤ و ٣٠٪";
  const original=text;
  const report=calculateFactDensity(text,"ar","full");
  assert.equal(text,original);
  assert.ok(report.candidateSignals.some(signal=>signal.value==="٢٠٢٤"));
  assert.ok(report.candidateSignals.some(signal=>signal.value==="٣٠٪"));
});


test("name hints stay descriptive and do not direct external verification",()=>{
  const result=checkDisambiguation("ABC","en");
  assert.match(result.recommendation,/not a uniqueness check/i);
  assert.doesNotMatch(result.recommendation,/search engines|registries|independent directories/i);
});


test("extracts an email address only as a supplied text candidate",()=>{
  const report=calculateFactDensity("Contact: info@example.com","en","full");
  assert.ok(report.candidateSignals.some(signal=>signal.category==="email"&&signal.value==="info@example.com"));
});

test("extracts labelled Arabic telephone numbers with Arabic-Indic digits",()=>{
  const report=calculateFactDensity("هاتف: ٠٧٧٠ ١٢٣ ٤٥٦٧","ar","full");
  assert.ok(report.candidateSignals.some(signal=>signal.category==="telephone"&&signal.value==="٠٧٧٠ ١٢٣ ٤٥٦٧"));
});

test("extracts formatted international telephone numbers as candidates",()=>{
  const report=calculateFactDensity("Call +964 770 123 4567 for information.","en","full");
  assert.ok(report.candidateSignals.some(signal=>signal.category==="telephone"&&signal.value==="+964 770 123 4567"));
});

test("extracts an address only when the input contains an address label",()=>{
  const report=calculateFactDensity("Address: 123 Example Street, Baghdad, Iraq","en","full");
  assert.ok(report.candidateSignals.some(signal=>signal.category==="address"&&signal.value==="123 Example Street, Baghdad, Iraq"));
  const unlabeled=calculateFactDensity("123 Example Street, Baghdad, Iraq","en","full");
  assert.equal(unlabeled.candidateSignals.some(signal=>signal.category==="address"),false);
});

test("extracts a labelled Arabic service list as one candidate",()=>{
  const report=calculateFactDensity("الخدمات: تصميم المواقع، تطبيقات الهاتف","ar","full");
  assert.ok(report.candidateSignals.some(signal=>signal.category==="service"&&signal.value==="تصميم المواقع، تطبيقات الهاتف"));
});

test("contact and profile extraction remains explicitly unverified",()=>{
  const report=calculateFactDensity("Email: info@example.com; Phone: 07701234567; Address: Baghdad","en","full");
  assert.ok(report.limitations.some(item=>/ownership or current status is not checked/i.test(item)));
});


for (const [index, example] of entityTextCorpus.entries()) {
  test("multilingual synthetic corpus " + String(index + 1).padStart(2, "0") + ": " + example.name, () => {
    const report = calculateFactDensity(example.text, example.lang, "full");
    const found = new Set(report.candidateSignals.map((signal) => signal.category));
    for (const category of example.expected) {
      assert.ok(found.has(category), "Expected candidate category " + category + "; found: " + [...found].join(", "));
    }
  });
}

test("empty local input returns an empty candidate list", () => {
  const report = calculateFactDensity("", "ar", "full");
  assert.equal(report.totalWordsAnalyzed, 0);
  assert.equal(report.candidateSignalCount, 0);
  assert.deepEqual(report.candidateSignals, []);
});

test("short unlabelled text does not invent contact or service values", () => {
  const report = calculateFactDensity("Baghdad sample text", "en", "full");
  assert.equal(report.candidateSignals.some((signal) => ["email", "telephone", "address", "service"].includes(signal.category)), false);
});

test("RTL and LTR text preserves original detected email and year values", () => {
  const text = "تأسست عام ٢٠٢٠، contact info@example.org، وتخدم ٥ دول.";
  const report = calculateFactDensity(text, "ar", "full");
  assert.ok(report.candidateSignals.some((signal) => signal.category === "year" && signal.value === "٢٠٢٠"));
  assert.ok(report.candidateSignals.some((signal) => signal.category === "email" && signal.value === "info@example.org"));
});


test("Arabic legal-form and organization words produce cautious name hints",()=>{
  const result=checkDisambiguation("شركة المثال","ar");
  assert.equal(result.heuristicRisk,"medium");
  assert.ok(result.matchedCommonTerms.includes("شركة"));
  assert.match(result.recommendation,/not an ownership or uniqueness assessment/i);
});

test("Sorani organization words produce cautious name hints",()=>{
  const result=checkDisambiguation("کۆمپانیای نموونە","ku");
  assert.equal(result.heuristicRisk,"medium");
  assert.ok(result.matchedCommonTerms.includes("کۆمپانیای"));
});

test("English legal suffixes produce cautious name hints",()=>{
  const result=checkDisambiguation("Example Holdings LLC","en");
  assert.equal(result.heuristicRisk,"medium");
  assert.ok(result.matchedCommonTerms.includes("llc"));
});

test("user-supplied Arabic and Latin aliases remain draft alternateName values",()=>{
  const pack=generateMachinePack({
    name:"شركة المثال",
    aliases:["Example Company LLC","  شركة المثال التجارية  ","Example Company LLC"]
  });
  assert.deepEqual(pack.jsonLd.alternateName,["Example Company LLC","شركة المثال التجارية"]);
  assert.ok(pack.warnings.every(warning=>! /verified|official ownership/i.test(warning) || /not independently verified|not verified/i.test(warning)));
});
