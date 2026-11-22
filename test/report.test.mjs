import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { auditEntity, generateEntityReports } from "../dist/index.js";

test("Markdown report includes scan window, candidate inventory, warnings and generated drafts",()=>{
  const input={
    name:"Example Studio",
    schemaType:"LocalBusiness",
    description:"A user-supplied description",
    headText:"Founded in 2024; serves 5 countries; email: info@example.test.",
    window:500,
    markets:["Iraq"],
    services:[{name:"Design"}]
  };
  const result=auditEntity(input);
  const report=generateEntityReports(input,result);
  assert.match(report.markdown,/Entity Preparation Report/);
  assert.match(report.markdown,/First 500 lexical words/);
  assert.match(report.markdown,/Candidate patterns/);
  assert.match(report.markdown,/Postal address/);
  assert.match(report.markdown,/Not supplied/);
  assert.match(report.markdown,/"@type": "LocalBusiness"/);
  assert.match(report.markdown,/# Example Studio/);
  assert.match(report.markdown,/not a visibility or ranking score/);
  assert.ok(report.markdown.includes(result.machinePack.llmsTxt.trim()));
});

test("Arabic reports are localized and HTML has right-to-left document direction",()=>{
  const input={name:"شركة المثال",lang:"ar",headText:"تأسست عام ٢٠٢٠، وتخدم ٥ دول."};
  const result=auditEntity(input);
  const report=generateEntityReports(input,result);
  assert.match(report.markdown,/تقرير تجهيز الكيان/);
  assert.match(report.markdown,/الأنماط المرشحة/);
  assert.match(report.html,/<html lang="ar" dir="rtl">/);
  assert.match(report.html,/تقرير تجهيز الكيان/);
  assert.match(report.html,/القيم المرشحة منقولة من النص المقدم/);
});

test("Sorani reports are localized and use RTL direction",()=>{
  const input={name:"کۆمپانیای نموونە",lang:"ku",headText:"لە ساڵی ٢٠٢٢ دامەزراوە."};
  const report=generateEntityReports(input,auditEntity(input));
  assert.match(report.markdown,/ڕاپۆرتی ئامادەکردنی کەسایەتی/);
  assert.match(report.html,/<html lang="ku" dir="rtl">/);
});

test("HTML report escapes injected markup from entity values and never embeds script elements",()=>{
  const malicious='<img src=x onerror="alert(1)"><script>alert("owned")</script>';
  const input={name:malicious,description:malicious,headText:"Founded in 2024."};
  const report=generateEntityReports(input,auditEntity(input));
  assert.match(report.html,/&lt;script&gt;/);
  assert.match(report.html,/&lt;img/);
  assert.equal(report.html.includes("<script>"),false);
  assert.equal(report.html.includes("<img "),false);
  assert.equal(report.html.includes("</script>"),false);
});

test("Markdown report dynamically lengthens fences for user-supplied backticks",()=>{
  const tick=String.fromCharCode(96);
  const description="User supplied "+tick.repeat(3)+" text and "+tick.repeat(4)+" another fence.";
  const input={name:"Example",description};
  const report=generateEntityReports(input,auditEntity(input));
  assert.ok(report.markdown.includes(tick.repeat(5)+"json"));
  assert.ok(report.markdown.includes(description));
});

test("CLI writes Markdown and HTML reports locally when requested",()=>{
  const folder=mkdtempSync(join(tmpdir(),"entity-truth-report-"));
  try{
    execFileSync(process.execPath,[
      resolve("dist/cli.js"),"Example Clinic","--type","LocalBusiness",
      "--description","A supplied local profile description",
      "--report","both","--out-dir",folder
    ],{encoding:"utf8"});
    const markdownPath=join(folder,"entity-report.md");
    const htmlPath=join(folder,"entity-report.html");
    assert.equal(existsSync(markdownPath),true);
    assert.equal(existsSync(htmlPath),true);
    assert.match(readFileSync(markdownPath,"utf8"),/تقرير تجهيز الكيان|Entity Preparation Report/);
    assert.match(readFileSync(htmlPath,"utf8"),/<!doctype html>/i);
    assert.throws(()=>execFileSync(process.execPath,[
      resolve("dist/cli.js"),"Example Clinic","--report","both","--out-dir",folder
    ]));
    execFileSync(process.execPath,[
      resolve("dist/cli.js"),"Example Clinic","--report","both","--out-dir",folder,"--force"
    ]);
  }finally{
    rmSync(folder,{recursive:true,force:true});
  }
});

test("CLI refuses report export without an explicit local output directory",()=>{
  assert.throws(()=>execFileSync(process.execPath,[
    resolve("dist/cli.js"),"Example","--report","md"
  ]));
});
