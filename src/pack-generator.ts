import type { EntityInput, EntitySchemaType, MachinePack } from "./types.js";

function clean(values:string[]|undefined){
  return Array.isArray(values)?[...new Set(values.filter((v):v is string=>typeof v==="string").map(v=>v.trim()).filter(Boolean))]:[];
}
function text(value:unknown):string|undefined {
  return typeof value==="string" && value.trim()?value.trim():undefined;
}
function safeUrl(value:string,label:string,warnings:string[]):string|undefined {
  try {
    const u=new URL(value);
    if(!["http:","https:"].includes(u.protocol)||u.username||u.password){
      warnings.push(label+" omitted: only HTTP(S) URLs without credentials are accepted.");
      return;
    }
    u.hash="";
    return u.toString();
  } catch {
    warnings.push(label+" omitted: invalid absolute URL.");
    return;
  }
}
function supportedSchemaType(value:unknown):EntitySchemaType {
  if(value===undefined) return "Organization";
  if(value==="Organization"||value==="LocalBusiness"||value==="ProfessionalService"||value==="Service") return value;
  throw new RangeError("schemaType must be Organization, LocalBusiness, ProfessionalService, or Service.");
}
function cleanAddress(input:EntityInput["address"]):Record<string,string>|undefined {
  if(!input || typeof input!=="object") return;
  const fields=["streetAddress","addressLocality","addressRegion","postalCode","addressCountry"] as const;
  const values:Record<string,string>={};
  for(const field of fields){const value=text(input[field]);if(value)values[field]=value;}
  return Object.keys(values).length?{"@type":"PostalAddress",...values}:undefined;
}
function cleanContactPoints(input:EntityInput["contactPoints"]):Record<string,unknown>[] {
  if(!Array.isArray(input)) return [];
  return input.map((item)=>{
    const result:Record<string,unknown>={"@type":"ContactPoint"};
    const contactType=text(item?.contactType),telephone=text(item?.telephone),email=text(item?.email);
    const languages=clean(item?.availableLanguage);
    if(contactType)result.contactType=contactType;
    if(telephone)result.telephone=telephone;
    if(email)result.email=email;
    if(languages.length)result.availableLanguage=languages;
    return result;
  }).filter(item=>Object.keys(item).length>1 && (item.telephone||item.email||item.contactType));
}
function cleanOpeningHours(input:EntityInput["openingHours"]):Record<string,unknown>[] {
  if(!Array.isArray(input)) return [];
  return input.map((item)=>{
    const result:Record<string,unknown>={"@type":"OpeningHoursSpecification"};
    const days=clean(item?.dayOfWeek),opens=text(item?.opens),closes=text(item?.closes);
    const validFrom=text(item?.validFrom),validThrough=text(item?.validThrough);
    if(days.length)result.dayOfWeek=days;
    if(opens)result.opens=opens;
    if(closes)result.closes=closes;
    if(validFrom)result.validFrom=validFrom;
    if(validThrough)result.validThrough=validThrough;
    return result;
  }).filter(item=>Array.isArray(item.dayOfWeek)||item.opens||item.closes);
}
function cleanServices(input:EntityInput["services"]):Record<string,unknown>[] {
  const result:Record<string,unknown>[]=[];
  if(!Array.isArray(input))return result;
  for(const item of input){
    const name=text(item?.name);
    if(!name)continue;
    const service:Record<string,unknown>={"@type":"Service",name};
    const description=text(item.description),serviceType=text(item.serviceType);
    if(description)service.description=description;
    if(serviceType)service.serviceType=serviceType;
    result.push({"@type":"Offer","itemOffered":service});
  }
  return result;
}
function cleanFaqs(input:EntityInput["faqs"]):Record<string,unknown>[] {
  const result:Record<string,unknown>[]=[];
  if(!Array.isArray(input))return result;
  for(const item of input){
    const question=text(item?.question),answer=text(item?.answer);
    if(!question||!answer)continue;
    result.push({"@type":"Question",name:question,acceptedAnswer:{"@type":"Answer",text:answer}});
  }
  return result;
}

export function generateMachinePack(input:EntityInput):MachinePack {
  const warnings:string[]=[];
  const name=text(input.name);
  if(!name)throw new TypeError("Entity name is required.");
  const schemaType=supportedSchemaType(input.schemaType);
  const description=(text(input.description)||text(input.headText)||"").slice(0,500);
  const aliases=clean(input.aliases),markets=clean(input.markets),languages=clean(input.knowsLanguages),facts=clean(input.facts);
  const url=input.url?.trim()?safeUrl(input.url.trim(),"Website",warnings):undefined;
  const profiles=clean(input.officialProfiles).map((p,i)=>safeUrl(p,"Profile "+(i+1),warnings)).filter((v):v is string=>!!v);
  const address=cleanAddress(input.address);
  const contactPoints=cleanContactPoints(input.contactPoints);
  const openingHours=cleanOpeningHours(input.openingHours);
  const services=cleanServices(input.services);
  const faqs=cleanFaqs(input.faqs);
  const primaryServiceType=text(input.serviceType);

  if(!url&&input.url?.trim()) warnings.push("Website URL was not included in JSON-LD.");
  if(profiles.length) warnings.push("Profile links are user supplied; ownership is not independently verified.");
  if(facts.length) warnings.push("Facts are user supplied and are not independently verified.");
  if(!markets.length) warnings.push("No served markets were supplied; Worldwide coverage is not assumed.");
  if(!languages.length) warnings.push("No entity languages were supplied; the tool's interface languages are not assigned to the entity.");
  if(input.address&&!address)warnings.push("Postal address omitted: no non-empty address fields were supplied.");
  if(input.contactPoints?.length&&!contactPoints.length)warnings.push("Contact points omitted: no usable contact fields were supplied.");
  if(input.openingHours?.length&&!openingHours.length)warnings.push("Opening hours omitted: no usable day or time fields were supplied.");
  if(input.services?.length&&!services.length)warnings.push("Services omitted: each service needs a non-empty name.");
  if(input.faqs?.length&&!faqs.length)warnings.push("FAQ page omitted: each item needs both a non-empty question and answer.");
  if((schemaType==="Organization"||schemaType==="Service")&&openingHours.length){
    warnings.push("Opening hours omitted for this primary type; use LocalBusiness or ProfessionalService to publish business hours.");
  }
  if(schemaType==="Service"&&(address||contactPoints.length||services.length)){
    warnings.push("Address, contact points and nested service catalog are omitted for a primary Service profile; use an organization or business type for provider details.");
  }
  if(schemaType!=="Service"&&primaryServiceType)warnings.push("Primary serviceType omitted because the selected schemaType is not Service.");
  if(!address && (schemaType==="LocalBusiness"||schemaType==="ProfessionalService"))warnings.push("No postal address was supplied for this business profile; none is inferred.");
  
  const jsonLd:Record<string,unknown>={"@context":"https://schema.org","@type":schemaType,name};
  if(url){const u=new URL(url);u.search="";u.hash="";u.pathname=u.pathname.replace(/\/+$/,"")+"/";jsonLd["@id"]=u.toString()+"#"+(schemaType==="Service"?"service":"organization");jsonLd.url=url;}
  if(description)jsonLd.description=description;
  if(aliases.length)jsonLd.alternateName=aliases;
  if(markets.length)jsonLd.areaServed=markets.map(name=>({"@type":"AdministrativeArea",name}));
  if(languages.length)jsonLd.knowsLanguage=languages;
  if(profiles.length)jsonLd.sameAs=profiles;
  if(address && schemaType!=="Service")jsonLd.address=address;
  if(contactPoints.length && schemaType!=="Service")jsonLd.contactPoint=contactPoints;
  if(openingHours.length && (schemaType==="LocalBusiness"||schemaType==="ProfessionalService"))jsonLd.openingHoursSpecification=openingHours;
  if(services.length && schemaType!=="Service")jsonLd.hasOfferCatalog={"@type":"OfferCatalog",name:"Services",itemListElement:services};
  if(faqs.length)jsonLd.subjectOf={"@type":"FAQPage",mainEntity:faqs};
  if(primaryServiceType && schemaType==="Service")jsonLd.serviceType=primaryServiceType;

  const lines=[
    `# ${name}`,"",
    description||"> User-supplied entity profile.","",
    "## Profile type","- Schema.org type: "+schemaType,"",
    "## Provenance","- Generated from user-supplied information.","- This output is a draft, not independent verification.","- No market or worldwide coverage is inferred.",""
  ];
  if(aliases.length)lines.push("## Alternate names",...aliases.map(x=>"- "+x),"");
  if(markets.length)lines.push("## User-supplied markets",...markets.map(x=>"- "+x),"");
  if(languages.length)lines.push("## User-supplied entity languages",...languages.map(x=>"- "+x),"");
  if(address)lines.push("## User-supplied postal address",...Object.entries(address).filter(([key])=>key!=="@type").map(([key,value])=>"- "+key+": "+value),"");
  if(contactPoints.length)lines.push("## User-supplied contact points",...contactPoints.map(point=>"- "+[point.contactType,point.email,point.telephone].filter(Boolean).join(" · ")),"");
  if(openingHours.length)lines.push("## User-supplied opening hours",...openingHours.map(item=>"- "+[...(item.dayOfWeek as string[]),item.opens+"–"+item.closes].join(" · ")),"");
  if(services.length)lines.push("## User-supplied services",...services.map(offer=>{const service=offer.itemOffered as Record<string,string>;return "- "+service.name+(service.description?": "+service.description:"");}),"");
  if(faqs.length)lines.push("## User-supplied questions and answers",...faqs.flatMap(item=>{const accepted=item.acceptedAnswer as Record<string,string>;return ["- Q: "+String(item.name), "  A: "+accepted.text];}),"");
  if(facts.length)lines.push("## User-supplied facts (not independently verified)",...facts.map(x=>"- "+x),"");
  if(url||profiles.length){lines.push("## User-supplied links (not independently verified)");if(url)lines.push("- Website: "+url);for(const p of profiles)lines.push("- Profile: "+p);lines.push("");}
  lines.push("## Limitations","- This tool does not fetch websites or verify link ownership.","- It does not verify facts or measure search/AI visibility.","- Structured output is a draft based only on values supplied by the user.","","---","Generated by Entity Truth Core — https://github.com/ahmedfouaadqi-glitch/entity-truth-core-by-MAAROOF-AI");
  return {jsonLd,llmsTxt:lines.join("\n").trim()+"\n",warnings:[...new Set(warnings)]};
}
