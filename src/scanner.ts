import type { AnalysisWindow, DisambiguationCheck, FactDensityReport, FactSignal, HeuristicRisk, SupportedLang } from "./types.js";

const COMMON_TERMS: Record<SupportedLang, Set<string>> = {
  ar: new Set(["معروف","مشهور","أصيل","مميز","حديث","سريع","دولي","وطني","أول","شامل","رائد","ذكي","متقدم"]),
  ku: new Set(["ناسراو","دیار","نوێ","خێرا","نێودەوڵەتی","یەکەم","پێشەنگ","باشترین","زیرەک"]),
  en: new Set(["best","leading","fast","innovative","top","global","prime","smart","known","famous","first","modern","advanced"])
};

const ARABIC_MARKS = /[\u064B-\u065F\u0670\u0640]/u;
const ARABIC_LETTER_MAP: Record<string,string> = {
  "أ":"ا",
  "إ":"ا",
  "آ":"ا",
  "ٱ":"ا",
  "ى":"ي"
};

function normalizeArabicCharacter(character:string):string {
  if(ARABIC_MARKS.test(character)) return "";
  return ARABIC_LETTER_MAP[character] ?? character;
}

function normalizeName(value:string):string {
  return Array.from(value.normalize("NFC").toLocaleLowerCase())
    .map(normalizeArabicCharacter)
    .join("")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .trim()
    .replace(/\s+/g," ");
}

interface MappedText {
  text:string;
  sourceStart:number[];
  sourceEnd:number[];
}

/**
 * Normalizes only characters needed for deterministic local pattern matching.
 * Each emitted UTF-16 code unit retains its source range so candidate values
 * can be returned exactly as they appeared in the user's supplied text.
 */
function normalizeForPatternMatching(input:string):MappedText {
  let normalized="";
  const sourceStart:number[]=[];
  const sourceEnd:number[]=[];

  for(let index=0;index<input.length;){
    const start=index;
    const codePoint=input.codePointAt(index);
    if(codePoint===undefined) break;
    const sourceCharacter=String.fromCodePoint(codePoint);
    index+=sourceCharacter.length;

    let replacement=normalizeArabicCharacter(sourceCharacter);
    if(replacement>="٠" && replacement<="٩") {
      replacement=String.fromCharCode(replacement.charCodeAt(0)-"٠".charCodeAt(0)+"0".charCodeAt(0));
    } else if(replacement>="۰" && replacement<="۹") {
      replacement=String.fromCharCode(replacement.charCodeAt(0)-"۰".charCodeAt(0)+"0".charCodeAt(0));
    } else if(replacement==="٪") {
      replacement="%";
    } else if(replacement==="٫") {
      replacement=".";
    } else if(replacement==="٬") {
      replacement=",";
    }

    if(!replacement) continue;
    normalized+=replacement;
    for(let unit=0;unit<replacement.length;unit++){
      sourceStart.push(start);
      sourceEnd.push(index);
    }
  }

  return {text:normalized,sourceStart,sourceEnd};
}

function selectAnalysisWindow(text:string, window:AnalysisWindow) {
  const limit = window === "full" ? Number.POSITIVE_INFINITY : window;
  const tokenPattern = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’\-]*/gu;
  let count = 0;
  let end = 0;

  for (const match of text.matchAll(tokenPattern)) {
    count += 1;
    end = (match.index ?? 0) + match[0].length;
    if (count >= limit) break;
  }

  return {
    snippet: window === "full" ? text : text.slice(0, end),
    count,
    maxWords: window === "full" ? count : window,
  };
}

function unique(items:FactSignal[]) {
  const seen=new Set<string>();
  return items.filter(x=>{const k=x.category+":"+x.value.toLocaleLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
}

export function calculateFactDensity(text:string,lang:SupportedLang="en",window:AnalysisWindow=100):FactDensityReport {
  if(!["ar","ku","en"].includes(lang)) throw new RangeError("Language must be ar, ku, or en.");
  if(window!==100 && window!==500 && window!=="full") throw new RangeError("Analysis window must be 100, 500, or full.");
  const selected=selectAnalysisWindow(typeof text==="string"?text:"",window);
  const {snippet,count,maxWords}=selected;
  const mapped=normalizeForPatternMatching(snippet);
  const normalizedText=mapped.text;
  const patterns:Array<[FactSignal["category"],RegExp]>=[
    ["year",/(?:19|20)[0-9]{2}/gu],
    ["percentage",/(?:^|[^\p{L}\p{N}])[0-9]{1,3}(?:[.,][0-9]+)?\s?%(?=$|[^\p{L}\p{N}])/gu],
    ["standard",/\b(?:ISO[\s-]?\d{3,5}(?:-\d+)?|GDPR|SOC\s?2|PCI[\s-]?DSS|POSIX)\b/giu],
    ["scale",/(?:^|[^\p{L}\p{N}])[0-9][0-9,.]*\+?\s*(?:users?|customers?|clients?|branches|countries|employees|offices|products|عميل|عملاء|فرع|فروع|دولة|دول|مستخدم|مستخدمين|وڵات|کڕیار|بەکارهێنەر)(?=$|[^\p{L}\p{N}])/giu],
    ["currency",/(?:[$€£]\s?[0-9][0-9,.]*|\b(?:IQD|USD|EUR|GBP)\s?[0-9][0-9,.]*\b|[0-9][0-9,.]*\s?(?:IQD|USD|EUR|GBP|د\s*\.\s*ع|دولار|یۆرۆ)(?![\p{L}\p{N}]))/giu]
  ];
  const signals:FactSignal[]=[];
  for(const [category,pattern] of patterns) for(const match of normalizedText.matchAll(pattern)) {
    const index=match.index??0;
    const start=mapped.sourceStart[index]??0;
    const end=mapped.sourceEnd[index+match[0].length-1]??start;
    const value=snippet.slice(start,end).trim().replace(/^[^\p{L}\p{N}$€£]+/u,"");
    if(value) signals.push({category,value});
  }
  const candidates=unique(signals), signalDensity=count?candidates.length/count:0;
  const windowDescription=window==="full"?"All lexical words in the supplied text were examined.":"Only the first "+window+" lexical words are examined.";
  return {
    method:"heuristic-pattern-scan",window,maxWords,totalWordsAnalyzed:count,candidateSignalCount:candidates.length,candidateSignals:candidates,
    signalDensity:Math.round(signalDensity*1000)/1000,
    heuristicScore:Math.min(100,Math.round(candidates.length/4*100)),
    interpretation:candidates.length>=4?"Several number/date/standard patterns were detected. Verify each item and its source.":candidates.length>=2?"Some candidate patterns were detected. Review them and add sourced details where useful.":"Few candidate patterns were detected. This does not mean the entity lacks facts.",
    limitations:["Detected patterns are candidates, not verified facts.","A number, date, percentage, currency, or standard can be false, outdated, or unrelated.","The scanner uses lightweight patterns and does not understand every language inflection.","Arabic-Indic and Persian digits, Arabic percent/number separators, common Arabic alef forms, diacritics and tatweel are normalized only for local pattern matching; returned candidate values preserve the supplied text.","The heuristic score is not a search-ranking factor or an AI-visibility measurement.",windowDescription]
  };
}

export function checkDisambiguation(name:string,lang:SupportedLang="en"):DisambiguationCheck {
  if(!["ar","ku","en"].includes(lang)) throw new RangeError("Language must be ar, ku, or en.");
  const normalizedName=normalizeName(name||"");
  const terms=new Set([...COMMON_TERMS[lang]].map(normalizeName));
  const matched=[...new Set(normalizedName.split(" ").filter(x=>x&&terms.has(x)))];
  const exact=terms.has(normalizedName), chars=Array.from(normalizedName.replace(/\s/g,"")).length, short=chars>0&&chars<=4;
  let heuristicRisk:HeuristicRisk="low";
  if(!normalizedName) heuristicRisk="unknown"; else if(exact) heuristicRisk="high"; else if(short||matched.length) heuristicRisk="medium";
  return {
    entityName:name,normalizedName,heuristicRisk,exactCommonTermMatch:exact,matchedCommonTerms:matched,shortNameSignal:short,lexiconCoverage:"limited-static-lexicon",
    limitations:["This uses a small static word list, not a global entity search.","It does not query search engines, company registries, trademark databases, or knowledge graphs.","Low heuristic risk does not prove uniqueness; high risk does not prove ownership by another organization."],
    recommendation:exact||matched.length?"Consider pairing the name with a precise industry descriptor when preparing the profile. This is a naming hint only, not an ownership or uniqueness assessment.":short?"Short names can be ambiguous. Consider adding a clear descriptor when preparing the profile; this is not a uniqueness check.":"No match was found in this small word list. This is not proof that the name is globally unique."
  };
}
