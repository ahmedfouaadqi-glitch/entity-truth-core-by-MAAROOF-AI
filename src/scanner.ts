import type { DisambiguationCheck, FactDensityReport, FactSignal, HeuristicRisk, SupportedLang } from "./types.js";

const COMMON_TERMS: Record<SupportedLang, Set<string>> = {
  ar: new Set(["معروف","مشهور","أصيل","مميز","حديث","سريع","دولي","وطني","أول","شامل","رائد","ذكي","متقدم"]),
  ku: new Set(["ناسراو","دیار","نوێ","خێرا","نێودەوڵەتی","یەکەم","پێشەنگ","باشترین","زیرەک"]),
  en: new Set(["best","leading","fast","innovative","top","global","prime","smart","known","famous","first","modern","advanced"])
};
const normalize = (s:string) => s.normalize("NFC").toLocaleLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
function first100(text:string) {
  const matches=[...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’\-]*/gu)];
  const selected=matches.slice(0,100);
  const last=selected.at(-1);
  return {snippet:last ? text.slice(0,(last.index??0)+last[0].length) : "",count:selected.length};
}
function unique(items:FactSignal[]) {
  const seen=new Set<string>();
  return items.filter(x=>{const k=x.category+":"+x.value.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
}
export function calculateFactDensity(text:string,lang:SupportedLang="en"):FactDensityReport {
  if(!["ar","ku","en"].includes(lang)) throw new RangeError("Language must be ar, ku, or en.");
  const {snippet,count}=first100(typeof text==="string"?text:"");
  const patterns:Array<[FactSignal["category"],RegExp]>=[
    ["year",/(?:19|20|١٩|٢٠|۱۹|۲۰)[0-9٠-٩۰-۹]{2}/gu],
    ["percentage",/(?:^|[^\p{L}\p{N}])[0-9٠-٩۰-۹]{1,3}(?:[.,٫][0-9٠-٩۰-۹]+)?\s?%(?=$|[^\p{L}\p{N}])/gu],
    ["standard",/\b(?:ISO[\s-]?\d{3,5}(?:-\d+)?|GDPR|SOC\s?2|PCI[\s-]?DSS|POSIX)\b/giu],
    ["scale",/(?:^|[^\p{L}\p{N}])[0-9٠-٩۰-۹][0-9٠-٩۰-۹,.٫]*\+?\s*(?:users?|customers?|clients?|branches|countries|employees|offices|products|عميل|عملاء|فرع|فروع|دولة|دول|مستخدم|مستخدمين|وڵات|کڕیار|بەکارهێنەر)(?=$|[^\p{L}\p{N}])/giu],
    ["currency",/(?:[$€£]\s?[0-9٠-٩۰-۹][0-9٠-٩۰-۹,.٫]*|\b(?:IQD|USD|EUR|GBP)\s?[0-9٠-٩۰-۹][0-9٠-٩۰-۹,.٫]*\b|\b[0-9٠-٩۰-۹][0-9٠-٩۰-۹,.٫]*\s?(?:IQD|USD|EUR|GBP|د\.ع|دولار|یۆرۆ)\b)/giu]
  ];
  const signals:FactSignal[]=[];
  for(const [category,pattern] of patterns) for(const m of snippet.matchAll(pattern)) {
    const value=m[0].trim().replace(/^[^\p{L}\p{N}$€£]+/u,"");
    if(value) signals.push({category,value});
  }
  const candidates=unique(signals), signalDensity=count?candidates.length/count:0;
  return {
    method:"heuristic-pattern-scan",maxWords:100,totalWordsAnalyzed:count,candidateSignalCount:candidates.length,candidateSignals:candidates,
    signalDensity:Math.round(signalDensity*1000)/1000,
    heuristicScore:Math.min(100,Math.round(candidates.length/4*100)),
    interpretation:candidates.length>=4?"Several number/date/standard patterns were detected. Verify each item and its source.":candidates.length>=2?"Some candidate patterns were detected. Review them and add sourced details where useful.":"Few candidate patterns were detected. This does not mean the entity lacks facts.",
    limitations:["Detected patterns are candidates, not verified facts.","A number, date, percentage, currency, or standard can be false, outdated, or unrelated.","The scanner uses lightweight patterns and does not understand every language inflection.","The heuristic score is not a search-ranking factor or an AI-visibility measurement.","Only the first 100 lexical words are examined."]
  };
}
export function checkDisambiguation(name:string,lang:SupportedLang="en"):DisambiguationCheck {
  if(!["ar","ku","en"].includes(lang)) throw new RangeError("Language must be ar, ku, or en.");
  const normalizedName=normalize(name||""), terms=COMMON_TERMS[lang];
  const matched=[...new Set(normalizedName.split(" ").filter(x=>x&&terms.has(x)))];
  const exact=terms.has(normalizedName), chars=Array.from(normalizedName.replace(/\s/g,"")).length, short=chars>0&&chars<=4;
  let heuristicRisk:HeuristicRisk="low";
  if(!normalizedName) heuristicRisk="unknown"; else if(exact) heuristicRisk="high"; else if(short||matched.length) heuristicRisk="medium";
  return {
    entityName:name,normalizedName,heuristicRisk,exactCommonTermMatch:exact,matchedCommonTerms:matched,shortNameSignal:short,lexiconCoverage:"limited-static-lexicon",
    limitations:["This uses a small static word list, not a global entity search.","It does not query search engines, company registries, trademark databases, or knowledge graphs.","Low heuristic risk does not prove uniqueness; high risk does not prove ownership by another organization."],
    recommendation:exact||matched.length?"Consider pairing the name with a precise industry descriptor in official references, then check independent sources.":short?"Short names can overlap with acronyms. Check exact-name results in independent directories and official registries.":"No match was found in this small word list. This is not proof that the name is globally unique."
  };
}
