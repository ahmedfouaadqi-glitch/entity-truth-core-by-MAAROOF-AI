import type { EntityAuditResult, EntityInput, SupportedLang } from "./types.js";

export interface EntityReportBundle {
  markdown: string;
  html: string;
}

interface FieldRow {
  label: string;
  supplied: boolean;
  included: boolean;
}

const CATEGORY_LABELS:Record<SupportedLang,Record<string,string>>={
  ar:{year:"سنة",percentage:"نسبة",standard:"معيار",scale:"حجم أو نطاق",currency:"عملة",email:"بريد إلكتروني",telephone:"هاتف",address:"عنوان",service:"خدمة"},
  ku:{year:"ساڵ",percentage:"ڕێژە",standard:"ستاندارد",scale:"قەبارە یان مەودا",currency:"دراو",email:"ئیمەیڵ",telephone:"تەلەفۆن",address:"ناونیشان",service:"خزمەتگوزاری"},
  en:{year:"Year",percentage:"Percentage",standard:"Standard",scale:"Scale",currency:"Currency",email:"Email",telephone:"Telephone",address:"Address",service:"Service"}
};

function present(value:unknown):boolean {
  if(typeof value==="string")return value.trim().length>0;
  if(Array.isArray(value))return value.length>0;
  if(value&&typeof value==="object")return Object.values(value).some(present);
  return value!==undefined&&value!==null&&value!==false;
}
function fields(input:EntityInput,result:EntityAuditResult):FieldRow[] {
  const json=result.machinePack.jsonLd;
  return [
    {label:"Entity name",supplied:present(input.name),included:present(json.name)},
    {label:"Description",supplied:present(input.description)||present(input.headText),included:present(json.description)},
    {label:"Website URL",supplied:present(input.url),included:present(json.url)},
    {label:"Alternate names",supplied:present(input.aliases),included:present(json.alternateName)},
    {label:"Served markets",supplied:present(input.markets),included:present(json.areaServed)},
    {label:"Entity languages",supplied:present(input.knowsLanguages),included:present(json.knowsLanguage)},
    {label:"Postal address",supplied:present(input.address),included:present(json.address)},
    {label:"Contact points",supplied:present(input.contactPoints),included:present(json.contactPoint)},
    {label:"Opening hours",supplied:present(input.openingHours),included:present(json.openingHoursSpecification)},
    {label:"Services",supplied:present(input.services),included:present(json.hasOfferCatalog)},
    {label:"FAQ content",supplied:present(input.faqs),included:present(json.subjectOf)},
    {label:"Service type",supplied:present(input.serviceType),included:present(json.serviceType)},
    {label:"User-supplied facts",supplied:present(input.facts),included:present(input.facts)},
    {label:"Profile links",supplied:present(input.officialProfiles),included:present(json.sameAs)}
  ];
}
function windowLabel(result:EntityAuditResult):string {
  const window=result.factDensity.window;
  return window==="full"?"Full supplied text":"First "+window+" lexical words";
}
function languageLabel(lang:SupportedLang):string {
  return lang==="ar"?"Arabic":lang==="ku"?"Sorani Kurdish":"English";
}
function markdownEscape(value:string):string {
  return value.replaceAll("\\","\\\\").replaceAll("|","\\|").replaceAll("\r\n","<br>").replaceAll("\n","<br>").replaceAll("<","&lt;");
}
function fenceFor(value:string):string {
  const tick=String.fromCharCode(96);
  const runs=value.split(tick);
  const longest=Math.max(0,...runs.slice(1).map((part,index)=>part.length===0?0:0));
  let current=0,maxRun=0;
  for(const character of value){if(character===tick){current+=1;maxRun=Math.max(maxRun,current);}else current=0;}
  return tick.repeat(Math.max(3,longest+1,maxRun+1));
}
function htmlEscape(value:string):string {
  return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
function htmlRows(rows:FieldRow[]):string {
  return rows.map(row=>"<tr><th scope=\"row\">"+htmlEscape(row.label)+"</th><td>"+(row.supplied?"Provided":"Not supplied")+"</td><td>"+(row.included?"Included in draft":"Not included")+"</td></tr>").join("");
}
function htmlSignals(result:EntityAuditResult):string {
  if(!result.factDensity.candidateSignals.length)return "<p>No candidate patterns were detected in the selected text window.</p>";
  const labels=CATEGORY_LABELS[result.language];
  return "<table><thead><tr><th>Candidate category</th><th>Original text value</th></tr></thead><tbody>"+
    result.factDensity.candidateSignals.map(signal=>"<tr><td>"+htmlEscape(labels[signal.category]??signal.category)+"</td><td dir=\"auto\">"+htmlEscape(signal.value)+"</td></tr>").join("")+
    "</tbody></table>";
}
function htmlList(items:string[]):string {
  if(!items.length)return "<p>None recorded.</p>";
  return "<ul>"+items.map(item=>"<li>"+htmlEscape(item)+"</li>").join("")+"</ul>";
}

export function generateEntityReports(input:EntityInput,result:EntityAuditResult):EntityReportBundle {
  const rows=fields(input,result);
  const labels=CATEGORY_LABELS[result.language];
  const signals=result.factDensity.candidateSignals;
  const json=JSON.stringify(result.machinePack.jsonLd,null,2);
  const llms=result.machinePack.llmsTxt;
  const jsonFence=fenceFor(json),llmsFence=fenceFor(llms);
  const markdown=[
    "# Entity Preparation Report",
    "",
    "- **Entity:** "+markdownEscape(result.entity),
    "- **Generated at:** "+markdownEscape(result.timestamp),
    "- **Schema.org type:** "+markdownEscape(String(result.machinePack.jsonLd["@type"]??"Organization")),
    "- **Report language:** "+languageLabel(result.language),
    "",
    "## Local scan",
    "",
    "- **Selected window:** "+windowLabel(result),
    "- **Lexical words scanned:** "+result.factDensity.totalWordsAnalyzed,
    "- **Candidate patterns:** "+result.factDensity.candidateSignalCount,
    "- **Heuristic score:** "+result.factDensity.heuristicScore+" (not a visibility or ranking score)",
    "",
    "## Candidate patterns",
    "",
    ...(signals.length?[
      "| Category | Original text value |",
      "|---|---|",
      ...signals.map(signal=>"| "+markdownEscape(labels[signal.category]??signal.category)+" | "+markdownEscape(signal.value)+" |")
    ]:["No candidate patterns were detected in the selected text window."]),
    "",
    "Candidate values are copied from the supplied text. They are not verified facts.",
    "",
    "## User-supplied field inventory",
    "",
    "| Field | Supplied by user | Included in draft |",
    "|---|---|---|",
    ...rows.map(row=>"| "+row.label+" | "+(row.supplied?"Yes":"Not supplied")+" | "+(row.included?"Yes":"No")+" |"),
    "",
    "A field marked “Not supplied” is an inventory note, not a recommendation to invent or infer a value.",
    "",
    "## Name hint",
    "",
    "- **Heuristic risk:** "+result.disambiguation.heuristicRisk,
    "- **Lexicon coverage:** "+result.disambiguation.lexiconCoverage,
    "- **Interpretation:** "+markdownEscape(result.disambiguation.recommendation),
    "",
    "## Generator warnings",
    "",
    ...(result.machinePack.warnings.length?result.machinePack.warnings.map(item=>"- "+markdownEscape(item)):["No generator warnings were recorded."]),
    "",
    "## Draft Schema.org JSON-LD",
    "",
    jsonFence+"json",
    json,
    jsonFence,
    "",
    "## Draft llms.txt content",
    "",
    llmsFence+"text",
    llms.trimEnd(),
    llmsFence,
    "",
    "## Scope and limitations",
    "",
    ...result.scopeNotice.map(item=>"- "+markdownEscape(item)),
    "- This report is generated locally from the supplied input and the tool's deterministic output.",
    "- No external research, fact verification, URL reachability check, ownership check, or visibility measurement was performed.",
    "",
    "Generated by Entity Truth Core."
  ].join("\n");

  const html="<!doctype html>\n"+
"<html lang=\""+result.language+"\" dir=\""+(result.language==="en"?"ltr":"rtl")+"\">\n"+
"<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"+
"<title>Entity Preparation Report — "+htmlEscape(result.entity)+"</title>\n"+
"<style>\n"+
":root{color-scheme:light;--ink:#202124;--muted:#62666d;--line:#d7dbe0;--paper:#fff;--wash:#f4f6f8;--accent:#8a6415}"+
"*{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font:15px/1.65 system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif}"+
"main{max-width:1000px;margin:28px auto;padding:34px;background:var(--paper);border:1px solid var(--line);border-radius:14px}"+
"h1{font-size:30px;margin:0 0 8px}h2{font-size:21px;margin:30px 0 10px;border-bottom:1px solid var(--line);padding-bottom:7px}"+
"p,.meta{color:var(--muted)}.meta{margin:3px 0}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}"+
".stat{background:var(--wash);border:1px solid var(--line);border-radius:10px;padding:12px}.stat strong{display:block;font-size:21px}.stat span{font-size:12px;color:var(--muted)}"+
"table{width:100%;border-collapse:collapse;margin:8px 0 16px}th,td{border:1px solid var(--line);padding:9px 10px;text-align:start;vertical-align:top}thead th{background:var(--wash)}"+
"pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f5f5;border:1px solid var(--line);border-radius:9px;padding:14px;direction:ltr;text-align:left;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}"+
".note{border-inline-start:4px solid var(--accent);background:#fbf6e9;padding:12px 14px;margin:14px 0}footer{border-top:1px solid var(--line);margin-top:32px;padding-top:14px;color:var(--muted);font-size:12px}"+
"@media(max-width:720px){main{margin:0;border-radius:0;padding:20px 14px}.stats{grid-template-columns:1fr 1fr}h1{font-size:25px}}"+
"@media print{body{background:#fff}main{max-width:none;margin:0;border:0;border-radius:0;padding:0}.stat,pre{break-inside:avoid}h2{break-after:avoid}table{break-inside:auto}tr{break-inside:avoid}}\n"+
"</style>\n</head>\n<body>\n<main>\n<header>\n"+
"<h1>Entity Preparation Report</h1>\n"+
"<p class=\"meta\"><strong>Entity:</strong> <span dir=\"auto\">"+htmlEscape(result.entity)+"</span></p>\n"+
"<p class=\"meta\"><strong>Generated:</strong> "+htmlEscape(result.timestamp)+"</p>\n"+
"<p class=\"meta\"><strong>Schema.org type:</strong> "+htmlEscape(String(result.machinePack.jsonLd["@type"]??"Organization"))+"</p>\n"+
"<p class=\"meta\"><strong>Report language:</strong> "+languageLabel(result.language)+"</p>\n"+
"</header>\n<section>\n<h2>Local scan</h2>\n<div class=\"stats\">\n"+
"<div class=\"stat\"><strong>"+result.factDensity.totalWordsAnalyzed+"</strong><span>Lexical words scanned</span></div>\n"+
"<div class=\"stat\"><strong>"+result.factDensity.candidateSignalCount+"</strong><span>Candidate patterns</span></div>\n"+
"<div class=\"stat\"><strong>"+result.factDensity.heuristicScore+"</strong><span>Heuristic score — not visibility</span></div>\n"+
"<div class=\"stat\"><strong>"+htmlEscape(result.factDensity.window==="full"?"Full text":String(result.factDensity.window))+"</strong><span>Selected window</span></div>\n"+
"</div>\n</section>\n"+
"<section><h2>Candidate patterns</h2>"+htmlSignals(result)+"<p>Candidate values preserve the supplied text. They are not verified facts.</p></section>\n"+
"<section><h2>User-supplied field inventory</h2><table><thead><tr><th>Field</th><th>Supplied by user</th><th>Included in draft</th></tr></thead><tbody>"+htmlRows(rows)+"</tbody></table><p>A field marked “Not supplied” is an inventory note, not a recommendation to infer or invent a value.</p></section>\n"+
"<section><h2>Name hint</h2><p><strong>Heuristic risk:</strong> "+htmlEscape(result.disambiguation.heuristicRisk)+"</p><p><strong>Lexicon coverage:</strong> "+htmlEscape(result.disambiguation.lexiconCoverage)+"</p><p>"+htmlEscape(result.disambiguation.recommendation)+"</p></section>\n"+
"<section><h2>Generator warnings</h2>"+htmlList(result.machinePack.warnings)+"</section>\n"+
"<section><h2>Draft Schema.org JSON-LD</h2><pre>"+htmlEscape(json)+"</pre></section>\n"+
"<section><h2>Draft llms.txt content</h2><pre>"+htmlEscape(llms.trimEnd())+"</pre></section>\n"+
"<section><h2>Scope and limitations</h2>"+htmlList([...result.scopeNotice,"This report is generated locally from the supplied input and the tool's deterministic output.","No external research, fact verification, URL reachability check, ownership check, or visibility measurement was performed."])+"</section>\n"+
"<footer>Generated by Entity Truth Core.</footer>\n</main>\n</body>\n</html>\n";
  return {markdown,html};
}
