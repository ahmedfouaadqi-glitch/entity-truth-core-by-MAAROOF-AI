import type { SupportedLang } from "./types.js";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface EntityProfileValidation {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: string[];
  scope: "local-structural-check";
}

type Locale = "ar" | "en";
type MessageKey =
  | "invalidObject" | "unsupportedContext" | "unsupportedType" | "requiredName"
  | "invalidUrl" | "invalidId" | "invalidAlternateName" | "invalidLanguages"
  | "invalidAreaServed" | "invalidSameAs" | "invalidAddress" | "invalidContactPoint"
  | "invalidOpeningHours" | "invalidOfferCatalog" | "invalidFaqPage" | "invalidServiceType";

const MESSAGES:Record<Locale,Record<MessageKey,string>>={
  en:{
    invalidObject:"JSON-LD must be a JSON object.",
    unsupportedContext:"Expected https://schema.org.",
    unsupportedType:"Supported types are Organization, LocalBusiness, ProfessionalService, Service, or FAQPage.",
    requiredName:"A non-empty name is required.",
    invalidUrl:"URL must be absolute HTTP(S) without embedded credentials.",
    invalidId:"@id must be based on an absolute HTTP(S) URL.",
    invalidAlternateName:"alternateName must be a non-empty string or an array of non-empty strings.",
    invalidLanguages:"knowsLanguage must contain non-empty strings.",
    invalidAreaServed:"Each areaServed item must be an object with a non-empty name.",
    invalidSameAs:"sameAs must contain absolute HTTP(S) URLs without embedded credentials.",
    invalidAddress:"address must be a PostalAddress object with at least one non-empty supported field.",
    invalidContactPoint:"contactPoint must contain ContactPoint objects with valid non-empty text fields.",
    invalidOpeningHours:"openingHoursSpecification must contain complete weekday and HH:MM opening/closing times.",
    invalidOfferCatalog:"hasOfferCatalog must contain Offer entries whose itemOffered is a named Service.",
    invalidFaqPage:"FAQPage must contain Question items with an accepted Answer and non-empty text.",
    invalidServiceType:"serviceType must be a non-empty string."
  },
  ar:{
    invalidObject:"يجب أن تكون بيانات JSON-LD كائناً منظماً.",
    unsupportedContext:"يجب أن تكون قيمة @context هي https://schema.org.",
    unsupportedType:"الأنواع المدعومة هي Organization وLocalBusiness وProfessionalService وService وFAQPage.",
    requiredName:"حقل الاسم مطلوب ولا يجوز أن يكون فارغاً.",
    invalidUrl:"يجب أن يكون الرابط مطلقاً ويستخدم HTTP أو HTTPS دون بيانات دخول مضمّنة.",
    invalidId:"يجب أن يستند @id إلى رابط مطلق يستخدم HTTP أو HTTPS.",
    invalidAlternateName:"يجب أن يكون alternateName نصاً غير فارغ أو مصفوفة من النصوص غير الفارغة.",
    invalidLanguages:"يجب أن يحتوي knowsLanguage على نصوص غير فارغة.",
    invalidAreaServed:"يجب أن يكون كل عنصر في areaServed كائناً يحتوي على اسم غير فارغ.",
    invalidSameAs:"يجب أن يحتوي sameAs على روابط مطلقة تستخدم HTTP أو HTTPS دون بيانات دخول.",
    invalidAddress:"يجب أن يكون address كائناً من نوع PostalAddress ويحتوي على حقل مدعوم واحد غير فارغ على الأقل.",
    invalidContactPoint:"يجب أن يحتوي contactPoint على كائنات ContactPoint وحقول نصية غير فارغة.",
    invalidOpeningHours:"يجب أن يحتوي openingHoursSpecification على أيام وأوقات فتح وإغلاق مكتملة بصيغة HH:MM.",
    invalidOfferCatalog:"يجب أن يحتوي hasOfferCatalog على عروض يتضمن كل منها خدمة Service مسماة.",
    invalidFaqPage:"يجب أن تحتوي FAQPage على أسئلة Question وأجوبة Answer بنصوص غير فارغة.",
    invalidServiceType:"يجب أن يكون serviceType نصاً غير فارغ."
  }
};

function isRecord(value:unknown):value is Record<string,unknown> {
  return typeof value==="object" && value!==null && !Array.isArray(value);
}
function isText(value:unknown):value is string {
  return typeof value==="string" && value.trim().length>0;
}
function isHttpUrl(value:string):boolean {
  try {
    const url=new URL(value);
    return (url.protocol==="http:"||url.protocol==="https:")&&!url.username&&!url.password;
  } catch {return false;}
}
function asArray(value:unknown):unknown[]|undefined {
  return Array.isArray(value)?value:[value];
}
function isClock(value:unknown):boolean {
  return typeof value==="string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function isDate(value:unknown):boolean {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+"T00:00:00Z");
  return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
const SUPPORTED_TYPES=new Set(["Organization","LocalBusiness","ProfessionalService","Service","FAQPage"]);
const ADDRESS_FIELDS=["streetAddress","addressLocality","addressRegion","postalCode","addressCountry"];

function validateFaqPage(value:unknown,path:string,message:(key:MessageKey)=>string,errors:ValidationIssue[]):boolean {
  if(!isRecord(value)||value["@type"]!=="FAQPage"||!Array.isArray(value.mainEntity)||value.mainEntity.length===0){
    errors.push({path,code:"invalid_faq_page",message:message("invalidFaqPage")});
    return false;
  }
  let valid=true;
  value.mainEntity.forEach((question,index)=>{
    const qPath=path+".mainEntity["+index+"]";
    if(!isRecord(question)||question["@type"]!=="Question"||!isText(question.name)||!isRecord(question.acceptedAnswer)||question.acceptedAnswer["@type"]!=="Answer"||!isText(question.acceptedAnswer.text)){
      errors.push({path:qPath,code:"invalid_faq_page",message:message("invalidFaqPage")});
      valid=false;
    }
  });
  return valid;
}

/**
 * Performs a local structural check of the supported subset emitted by this project.
 * It does not fetch links, verify entity facts, check ownership, or validate every Schema.org property.
 */
export function validateEntityProfile(value:unknown,lang:SupportedLang="en"):EntityProfileValidation {
  const errors:ValidationIssue[]=[];
  const warnings:string[]=[];
  const locale:Locale=lang==="en"?"en":"ar";
  const message=(key:MessageKey)=>MESSAGES[locale][key];
  const add=(path:string,code:string,key:MessageKey)=>errors.push({path,code,message:message(key)});

  if(!isRecord(value)){
    return {valid:false,errors:[{path:"$",code:"invalid_object",message:message("invalidObject")}],warnings:[],scope:"local-structural-check"};
  }
  if(value["@context"]!=="https://schema.org")add("$['@context']","unsupported_context","unsupportedContext");
  const type=value["@type"];
  if(typeof type!=="string"||!SUPPORTED_TYPES.has(type))add("$['@type']","unsupported_type","unsupportedType");

  if(type==="FAQPage"){
    validateFaqPage(value,"$",message,errors);
    warnings.push("FAQ text is user supplied; neither completeness nor factual accuracy is independently checked.");
    warnings.push("This is a local structural check of a limited FAQPage subset, not full Schema.org validation.");
    return {valid:errors.length===0,errors,warnings,scope:"local-structural-check"};
  }

  if(!isText(value.name))add("$.name","required_name","requiredName");
  if(value.url!==undefined&&(!isText(value.url)||!isHttpUrl(value.url)))add("$.url","invalid_url","invalidUrl");
  if(value["@id"]!==undefined&&(!isText(value["@id"])||!isHttpUrl(value["@id"].replace(/#.*$/,""))))add("$['@id']","invalid_id","invalidId");

  if(value.alternateName!==undefined){
    const aliases=asArray(value.alternateName);
    if(!aliases?.length||aliases.some(item=>!isText(item)))add("$.alternateName","invalid_alternate_name","invalidAlternateName");
  }
  if(value.knowsLanguage!==undefined){
    const languages=asArray(value.knowsLanguage);
    if(!languages?.length||languages.some(item=>!isText(item)))add("$.knowsLanguage","invalid_languages","invalidLanguages");
  }
  if(value.areaServed!==undefined){
    const areas=asArray(value.areaServed);
    if(!areas?.length||areas.some(area=>!isRecord(area)||!isText(area.name)))add("$.areaServed","invalid_area_served","invalidAreaServed");
  }
  if(value.sameAs!==undefined){
    const links=asArray(value.sameAs);
    if(!links?.length||links.some(link=>typeof link!=="string"||!isHttpUrl(link)))add("$.sameAs","invalid_same_as","invalidSameAs");
    else warnings.push("sameAs URLs are structurally valid only; ownership and official status are not verified.");
  }

  if(value.address!==undefined){
    const address=value.address;
    if(!isRecord(address)||address["@type"]!=="PostalAddress"||!ADDRESS_FIELDS.some(field=>isText(address[field]))||ADDRESS_FIELDS.some(field=>address[field]!==undefined&&!isText(address[field]))){
      add("$.address","invalid_address","invalidAddress");
    }
  }

  if(value.contactPoint!==undefined){
    const contacts=asArray(value.contactPoint);
    if(!contacts?.length||contacts.some(contact=>!isRecord(contact)||contact["@type"]!=="ContactPoint"||
      ["contactType","telephone","email"].some(field=>contact[field]!==undefined&&!isText(contact[field]))||
      (contact.availableLanguage!==undefined&&(!Array.isArray(contact.availableLanguage)||contact.availableLanguage.length===0||contact.availableLanguage.some(item=>!isText(item))))||
      !["telephone","email","contactType"].some(field=>isText(contact[field])))){
      add("$.contactPoint","invalid_contact_point","invalidContactPoint");
    } else warnings.push("Contact details are user supplied; reachability, current status and ownership are not checked.");
  }

  if(value.openingHoursSpecification!==undefined){
    const records=asArray(value.openingHoursSpecification);
    const weekdays=new Set(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day=>"https://schema.org/"+day));
    if(!records?.length||records.some(item=>{
      if(!isRecord(item)||item["@type"]!=="OpeningHoursSpecification")return true;
      const days=asArray(item.dayOfWeek);
      if(!days?.length||days.some(day=>typeof day!=="string"||!weekdays.has(day)))return true;
      if(!isClock(item.opens)||!isClock(item.closes))return true;
      if(item.validFrom!==undefined&&!isDate(item.validFrom))return true;
      if(item.validThrough!==undefined&&!isDate(item.validThrough))return true;
      if(isDate(item.validFrom)&&isDate(item.validThrough)&&String(item.validFrom)>String(item.validThrough))return true;
      return false;
    }))add("$.openingHoursSpecification","invalid_opening_hours","invalidOpeningHours");
  }

  if(value.hasOfferCatalog!==undefined){
    const catalog=value.hasOfferCatalog;
    if(!isRecord(catalog)||catalog["@type"]!=="OfferCatalog"||!Array.isArray(catalog.itemListElement)||catalog.itemListElement.length===0||
      catalog.itemListElement.some(offer=>!isRecord(offer)||offer["@type"]!=="Offer"||!isRecord(offer.itemOffered)||offer.itemOffered["@type"]!=="Service"||!isText(offer.itemOffered.name)||
        (offer.itemOffered.description!==undefined&&!isText(offer.itemOffered.description))||
        (offer.itemOffered.serviceType!==undefined&&!isText(offer.itemOffered.serviceType)))){
      add("$.hasOfferCatalog","invalid_offer_catalog","invalidOfferCatalog");
    }
  }

  if(value.subjectOf!==undefined){
    validateFaqPage(value.subjectOf,"$.subjectOf",message,errors);
    warnings.push("FAQ text is user supplied; neither completeness nor factual accuracy is independently checked.");
  }
  if(value.serviceType!==undefined&&!isText(value.serviceType))add("$.serviceType","invalid_service_type","invalidServiceType");
  if(type==="ProfessionalService")warnings.push("ProfessionalService is deprecated in Schema.org; consider LocalBusiness or Service as appropriate.");
  if(type==="LocalBusiness"||type==="ProfessionalService"){
    if(value.address===undefined)warnings.push("No postal address was supplied for this business profile.");
  }
  warnings.push("This is a local structural check of the supported profile subset, not full Schema.org validation or independent entity verification.");
  return {valid:errors.length===0,errors,warnings,scope:"local-structural-check"};
}
