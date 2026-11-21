import type { AnalysisWindow, DisambiguationCheck, FactDensityReport, FactSignal, HeuristicRisk, SupportedLang } from "./types.js";

const COMMON_TERMS: Record<SupportedLang, Set<string>> = {
  ar: new Set([
    "معروف","مشهور","أصيل","مميز","حديث","سريع","دولي","وطني","أول","شامل","رائد","ذكي","متقدم",
    "شركة","شركه","مؤسسة","موسسة","مجموعة","مجموعه","القابضة","قابضة","المحدودة","محدودة",
    "تجارية","للتجارة","التجارة","العامة","ذمم","مسؤولية","مساهمة"
  ]),
  ku: new Set([
    "ناسراو","دیار","نوێ","خێرا","نێودەوڵەتی","یەکەم","پێشەنگ","باشترین","زیرەک",
    "کۆمپانیا","کۆمپانیای","دامەزراوە","گرووپ","گروپ","سنووردار","بازرگانی","گشتی","هاوبەش"
  ]),
  en: new Set([
    "best","leading","fast","innovative","top","global","prime","smart","known","famous","first","modern","advanced",
    "company","companies","co","corporation","corp","inc","incorporated","limited","ltd","llc","plc",
    "group","holding","holdings","trading","general","enterprise","enterprises"
  ])
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
  const signals:FactSignal[]=[];
  const addSignal=(category:FactSignal["category"],startIndex:number,length:number)=>{
    const start=mapped.sourceStart[startIndex]??0;
    const end=mapped.sourceEnd[startIndex+length-1]??start;
    const rawValue=snippet.slice(start,end).trim();
    const value=category==="telephone" ? rawValue : rawValue.replace(/^[^\p{L}\p{N}$€£]+/u,"");
    if(value) signals.push({category,value});
  };
  const patterns:Array<[FactSignal["category"],RegExp]>=[
    ["year",/(?<![0-9])(?:19|20)[0-9]{2}(?![0-9])/gu],
    ["percentage",/(?:^|[^\p{L}\p{N}])[0-9]{1,3}(?:[.,][0-9]+)?\s?%(?=$|[^\p{L}\p{N}])/gu],
    ["standard",/\b(?:ISO[\s-]?\d{3,5}(?:-\d+)?|GDPR|SOC\s?2|PCI[\s-]?DSS|POSIX)\b/giu],
    ["scale",/(?:^|[^\p{L}\p{N}])[0-9][0-9,.]*\+?\s*(?:users?|customers?|clients?|branches|countries|employees|offices|products|عميل|عملاء|فرع|فروع|دولة|دول|مستخدم|مستخدمين|وڵات|کڕیار|بەکارهێنەر)(?=$|[^\p{L}\p{N}])/giu],
    ["currency",/(?:[$€£]\s?[0-9][0-9,.]*|\b(?:IQD|USD|EUR|GBP)\s?[0-9][0-9,.]*\b|[0-9][0-9,.]*\s?(?:IQD|USD|EUR|GBP|د\s*\.\s*ع|دولار|یۆرۆ)(?![\p{L}\p{N}]))/giu],
    ["email",/[A-Z0-9.!#$%&'*+/=?^_{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}/giu]
  ];
  for(const [category,pattern] of patterns) for(const match of normalizedText.matchAll(pattern)) {
    addSignal(category,match.index??0,match[0].length);
  }

  const labelledPhone=/(?:phone|telephone|mobile|tel|هاتف|موبايل|تلفون|ژمارەی\s+تەلەفۆن)\s*[:：-]?\s*(\+?[0-9][0-9 .()-]{5,20}[0-9])/giu;
  for(const match of normalizedText.matchAll(labelledPhone)){
    const value=match[1]??"";
    const digits=value.replace(/[^0-9]/g,"").length;
    if(digits>=7 && digits<=15){
      const offset=match[0].lastIndexOf(value);
      addSignal("telephone",(match.index??0)+offset,value.length);
    }
  }

  const formattedPhone=/(?<![\p{L}\p{N}])\+?[0-9][0-9 .()-]{5,20}[0-9](?![\p{L}\p{N}])/gu;
  for(const match of normalizedText.matchAll(formattedPhone)){
    const digits=match[0].replace(/[^0-9]/g,"").length;
    const separators=match[0].match(/[ .()-]/g)?.length??0;
    if(digits>=7 && digits<=15 && separators>=2) addSignal("telephone",match.index??0,match[0].length);
  }

  const labelledAddress=/(?:address|location|العنوان(?:\s+التفصيلي)?|ناونیشان)\s*[:：-]\s*([^\n;]{5,160})/giu;
  for(const match of normalizedText.matchAll(labelledAddress)){
    const value=match[1]??"";
    const offset=match[0].lastIndexOf(value);
    addSignal("address",(match.index??0)+offset,value.length);
  }

  const labelledServices=/(?:our\s+services|services?|products|الخدمات|خدماتنا|خزمەتگوزارییەکان|خزمەتگوزاری)\s*[:：-]\s*([^\n;]{3,180})/giu;
  for(const match of normalizedText.matchAll(labelledServices)){
    const value=match[1]??"";
    const offset=match[0].lastIndexOf(value);
    addSignal("service",(match.index??0)+offset,value.length);
  }
  const candidates=unique(signals), signalDensity=count?candidates.length/count:0;
  const windowDescription=window==="full"?"All lexical words in the supplied text were examined.":"Only the first "+window+" lexical words are examined.";
  return {
    method:"heuristic-pattern-scan",window,maxWords,totalWordsAnalyzed:count,candidateSignalCount:candidates.length,candidateSignals:candidates,
    signalDensity:Math.round(signalDensity*1000)/1000,
    heuristicScore:Math.min(100,Math.round(candidates.length/4*100)),
    interpretation:candidates.length>=4?"Several candidate patterns were detected. Review each item against your own records.":candidates.length>=2?"Some candidate patterns were detected. Review them before using the generated profile.":"Few candidate patterns were detected. This does not mean the entity lacks facts.",
    limitations:["Detected patterns are candidates, not verified facts.", "Emails, phone numbers, labelled addresses and labelled service lists are extracted only as text candidates; their validity, ownership or current status is not checked.","A number, date, percentage, currency, or standard can be false, outdated, or unrelated.","The scanner uses lightweight patterns and does not understand every language inflection.","Arabic-Indic and Persian digits, Arabic percent/number separators, common Arabic alef forms, diacritics and tatweel are normalized only for local pattern matching; returned candidate values preserve the supplied text.","The heuristic score is not a search-ranking factor or an AI-visibility measurement.",windowDescription]
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
