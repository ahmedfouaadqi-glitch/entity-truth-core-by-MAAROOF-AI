import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  executeEntityNameHint,
  executeEntityProfileGenerate,
  executeEntityProfileValidate,
  executeEntityScan,
} from "../dist/mcp/tools.js";
import { validateEntityProfile } from "../dist/validator.js";

test("MCP entity_scan delegates to the shared core", () => {
  const result = executeEntityScan({
    name: "Example Organization",
    headText: "Founded in 2018, serving 4 countries with ISO 9001.",
    lang: "en",
  });
  assert.equal(result.entity, "Example Organization");
  assert.equal(result.factDensity.method, "heuristic-pattern-scan");
  assert.ok(result.factDensity.candidateSignalCount >= 2);
  assert.match(result.scopeNotice.join(" "), /no network requests/i);
});

test("MCP entity_name_hint remains a limited static heuristic", () => {
  const result = executeEntityNameHint({ name: "معروف", lang: "ar" });
  assert.equal(result.heuristicRisk, "high");
  assert.equal(result.lexiconCoverage, "limited-static-lexicon");
  assert.match(result.limitations.join(" "), /global entity search/i);
});

test("MCP profile generation uses only supplied values", () => {
  const result = executeEntityProfileGenerate({ name: "Example Organization" });
  assert.equal(result.jsonLd.name, "Example Organization");
  assert.equal("areaServed" in result.jsonLd, false);
  assert.match(result.llmsTxt, /not independent verification/i);
});

test("JSON-LD validator accepts the generator's supported Organization subset", () => {
  const pack = executeEntityProfileGenerate({
    name: "Example Organization",
    url: "https://example.org",
    markets: ["Iraq"],
    knowsLanguages: ["ar", "en"],
  });
  const validation = validateEntityProfile(pack.jsonLd);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
  assert.equal(validation.scope, "local-structural-check");
});

test("JSON-LD validator rejects invalid structure and unsafe URLs", () => {
  const validation = executeEntityProfileValidate({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Example",
    url: "javascript:alert(1)",
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((item) => item.code === "invalid_url"));
});

test("Codex and Claude skills are byte-identical to the canonical skill", async () => {
  const paths = [
    "skills/entity-truth-core/SKILL.md",
    ".agents/skills/entity-truth-core/SKILL.md",
    ".claude/skills/entity-truth-core/SKILL.md",
  ];
  const contents = await Promise.all(paths.map((path) => readFile(new URL("../" + path, import.meta.url), "utf8")));
  assert.ok(contents.every((content) => content === contents[0]));
});

test("browser playground consumes the shared TypeScript build instead of duplicating scanner rules", async () => {
  const html = await readFile(new URL("../playground/index.html", import.meta.url), "utf8");
  assert.match(html, /type="module"/);
  assert.match(html, /import\s*\{\s*auditEntity\s*\}\s*from\s*["']\.\.\/dist\/index\.js["']/);
  assert.doesNotMatch(html, /function\s+(?:scan|first100)\s*\(/);
  assert.doesNotMatch(html, /const\s+COMMON_TERMS\s*=/);
});


test("MCP scan wrapper forwards the selected local analysis window", () => {
  const text = [...Array(100).fill("word"), "2024"].join(" ");
  const result = executeEntityScan({ name: "Example", headText: text, lang: "en", window: 500 });
  assert.equal(result.factDensity.window, 500);
  assert.ok(result.factDensity.candidateSignals.some((signal) => signal.category === "year"));
});


test("browser playground exposes the same 100, 500 and full scan windows", async () => {
  const html = await readFile(new URL("../playground/index.html", import.meta.url), "utf8");
  assert.match(html, /<select id="window">/);
  assert.match(html, /option value="100"/);
  assert.match(html, /option value="500"/);
  assert.match(html, /option value="full"/);
  assert.match(html, /window:\s*\$\("window"\)/);
});


test("browser playground has localized labels for contact candidate categories", async () => {
  const html = await readFile(new URL("../playground/index.html", import.meta.url), "utf8");
  assert.match(html, /signalLabels\s*=\s*\{/);
  assert.match(html, /email:"بريد إلكتروني"/);
  assert.match(html, /email:"Email"/);
  assert.match(html, /email:"ئیمەیڵ"/);
  assert.match(html, /signalLabels\[ui\]\[signal\.category\]/);
});


test("MCP profile generation preserves supplied multilingual alternate names",()=>{
  const result=executeEntityProfileGenerate({
    name:"شركة المثال",
    aliases:["Example LLC","کۆمپانیای نموونە"],
    lang:"ar"
  });
  assert.deepEqual(result.jsonLd.alternateName,["Example LLC","کۆمپانیای نموونە"]);
});


test("LocalBusiness profile generates only explicitly supplied address, contacts and hours",()=>{
  const result=executeEntityProfileGenerate({
    name:"Example Clinic",
    schemaType:"LocalBusiness",
    address:{streetAddress:"1 Example Street",addressLocality:"Baghdad",addressCountry:"Iraq"},
    contactPoints:[{contactType:"appointments",telephone:"+00000000000",email:"hello@example.test",availableLanguage:["ar","en"]}],
    openingHours:[{dayOfWeek:["Monday","Tuesday"],opens:"09:00",closes:"17:00"}],
    services:[{name:"Consultation",description:"User-supplied service description"}]
  });
  assert.equal(result.jsonLd["@type"],"LocalBusiness");
  assert.deepEqual(result.jsonLd.address,{"@type":"PostalAddress",streetAddress:"1 Example Street",addressLocality:"Baghdad",addressCountry:"Iraq"});
  assert.equal(result.jsonLd.contactPoint[0]["@type"],"ContactPoint");
  assert.equal(result.jsonLd.openingHoursSpecification[0]["@type"],"OpeningHoursSpecification");
  assert.equal(result.jsonLd.hasOfferCatalog.itemListElement[0].itemOffered["@type"],"Service");
  const validation=validateEntityProfile(result.jsonLd,"en");
  assert.equal(validation.valid,true);
  assert.equal(validation.errors.length,0);
});

test("ProfessionalService profile validates a user-supplied postal address",()=>{
  const result=executeEntityProfileGenerate({
    name:"Example Legal Practice",
    schemaType:"ProfessionalService",
    address:{addressLocality:"Baghdad",addressCountry:"Iraq"}
  });
  assert.equal(result.jsonLd["@type"],"ProfessionalService");
  assert.equal(validateEntityProfile(result.jsonLd,"ar").valid,true);
});

test("primary Service profile uses only supplied service type and service area",()=>{
  const result=executeEntityProfileGenerate({
    name:"Translation Service",
    schemaType:"Service",
    serviceType:"Translation",
    markets:["Iraq"]
  });
  assert.equal(result.jsonLd["@type"],"Service");
  assert.equal(result.jsonLd.serviceType,"Translation");
  assert.equal(result.jsonLd.areaServed[0].name,"Iraq");
  assert.equal("address" in result.jsonLd,false);
  assert.equal(validateEntityProfile(result.jsonLd).valid,true);
});

test("user-entered FAQs become a nested FAQPage with Question and Answer nodes",()=>{
  const result=executeEntityProfileGenerate({
    name:"Example Organization",
    faqs:[{question:"What are your hours?",answer:"Monday to Friday, 9 to 5."}]
  });
  assert.equal(result.jsonLd.subjectOf["@type"],"FAQPage");
  assert.equal(result.jsonLd.subjectOf.mainEntity[0]["@type"],"Question");
  assert.equal(result.jsonLd.subjectOf.mainEntity[0].acceptedAnswer["@type"],"Answer");
  assert.equal(validateEntityProfile(result.jsonLd).valid,true);
});

test("validator supports a standalone FAQPage with Arabic messages",()=>{
  const result=executeEntityProfileValidate({
    "@context":"https://schema.org",
    "@type":"FAQPage",
    mainEntity:[{"@type":"Question",name:"سؤال",acceptedAnswer:{"@type":"Answer",text:"جواب"}}]
  },"ar");
  assert.equal(result.valid,true);
  assert.ok(result.warnings.some(item=>/FAQPage subset/i.test(item)));
});

test("validator reports precise Arabic field paths for malformed LocalBusiness address",()=>{
  const result=executeEntityProfileValidate({
    "@context":"https://schema.org",
    "@type":"LocalBusiness",
    name:"Example",
    address:{"@type":"PostalAddress",addressLocality:""}
  },"ar");
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(item=>item.path==="$.address"&&/يجب أن يكون address/.test(item.message)));
});

test("validator rejects malformed opening hours and offer catalogs",()=>{
  const result=executeEntityProfileValidate({
    "@context":"https://schema.org",
    "@type":"LocalBusiness",
    name:"Example",
    openingHoursSpecification:[{"@type":"OpeningHoursSpecification",dayOfWeek:["Funday"],opens:"25:00",closes:"9am"}],
    hasOfferCatalog:{"@type":"OfferCatalog",itemListElement:[{"@type":"Offer",itemOffered:{"@type":"Service",name:" "}}]}
  });
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(item=>item.path==="$.openingHoursSpecification"));
  assert.ok(result.errors.some(item=>item.path==="$.hasOfferCatalog"));
});

test("unsupported schema type is rejected rather than silently generated",()=>{
  assert.throws(()=>executeEntityProfileGenerate({name:"Example",schemaType:"MedicalOrganization"}),/schemaType must be/);
});


test("MCP profile generation preserves business address, contacts, opening hours and services",()=>{
  const result=executeEntityProfileGenerate({
    name:"Sample Studio",
    schemaType:"ProfessionalService",
    address:{addressLocality:"Baghdad",addressCountry:"Iraq"},
    contactPoints:[{email:"contact@example.test"}],
    openingHours:[{dayOfWeek:["Sunday"],opens:"10:00",closes:"16:00"}],
    services:[{name:"Design"}]
  });
  assert.equal(result.jsonLd["@type"],"ProfessionalService");
  assert.equal(result.jsonLd.address.addressCountry,"Iraq");
  assert.equal(result.jsonLd.contactPoint[0].email,"contact@example.test");
  assert.equal(result.jsonLd.openingHoursSpecification[0].dayOfWeek[0],"https://schema.org/Sunday");
  assert.equal(result.jsonLd.hasOfferCatalog.itemListElement[0].itemOffered.name,"Design");
});

test("browser playground exposes local business, address, contact, hours and FAQ inputs", async()=>{
  const html=await readFile(new URL("../playground/index.html",import.meta.url),"utf8");
  for(const field of ["schemaType","streetAddress","addressLocality","addressRegion","postalCode","addressCountry","contactEmail","contactPhone","services","openingHours","faqs"]){
    assert.match(html,new RegExp('id="'+field+'"'));
  }
  assert.match(html,/value="LocalBusiness"/);
  assert.match(html,/value="ProfessionalService"/);
  assert.match(html,/JSON\.parse\(\$\("openingHours"\)\.value\)/);
  assert.match(html,/schemaType:\s*\$\("schemaType"\)\.value/);
});


test("generator reports partially omitted malformed user-supplied nested values",()=>{
  const result=executeEntityProfileGenerate({
    name:"Example Business",
    schemaType:"LocalBusiness",
    services:[{name:"Consulting"},{name:"  "}],
    faqs:[{question:"How can I contact you?",answer:"Email us."},{question:"",answer:""}],
    openingHours:[
      {dayOfWeek:["Monday"],opens:"09:00",closes:"17:00"},
      {dayOfWeek:[],opens:"",closes:""}
    ]
  });
  assert.equal(result.jsonLd.hasOfferCatalog.itemListElement.length,1);
  assert.equal(result.jsonLd.subjectOf.mainEntity.length,1);
  assert.equal(result.jsonLd.openingHoursSpecification.length,1);
  assert.ok(result.warnings.some(item=>/One or more service entries were omitted/));
  assert.ok(result.warnings.some(item=>/One or more FAQ entries were omitted/));
  assert.ok(result.warnings.some(item=>/One or more opening-hours records were omitted/));
});


test("legacy ProfessionalService schema type is retained with an explicit deprecation warning",()=>{
  const result=executeEntityProfileGenerate({name:"Example Practice",schemaType:"ProfessionalService"});
  assert.equal(result.jsonLd["@type"],"ProfessionalService");
  assert.ok(result.warnings.some(item=>/ProfessionalService is deprecated in Schema.org/i.test(item)));
  const validation=validateEntityProfile(result.jsonLd);
  assert.ok(validation.warnings.some(item=>/ProfessionalService is deprecated in Schema.org/i.test(item)));
});

test("opening-hours day names are normalized to Schema.org DayOfWeek identifiers",()=>{
  const result=executeEntityProfileGenerate({
    name:"Example Business",
    schemaType:"LocalBusiness",
    openingHours:[{dayOfWeek:["Monday","tuesday","https://schema.org/Friday"],opens:"09:00",closes:"17:00"}]
  });
  assert.deepEqual(result.jsonLd.openingHoursSpecification[0].dayOfWeek,[
    "https://schema.org/Monday",
    "https://schema.org/Tuesday",
    "https://schema.org/Friday"
  ]);
  assert.equal(validateEntityProfile(result.jsonLd).valid,true);
});
