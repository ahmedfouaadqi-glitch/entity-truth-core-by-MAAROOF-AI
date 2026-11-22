#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { auditEntity, generateEntityReports } from "./index.js";
import type { AnalysisWindow, ContactPointInput, EntityInput, EntitySchemaType, FAQItemInput, OpeningHoursSpecificationInput, PostalAddressInput, ServiceInput, SupportedLang } from "./types.js";

function help(){console.log(`Entity Truth Core — local entity profile preparation
Usage:
  entity-truth "Entity name" --text "Opening description" [options]
  entity-truth --input ./entity.json [options]
Options:
  --url <url>        Official website URL (not fetched)
  --description <x>  Entity description
  --lang <ar|ku|en>  Output language (default: en)
  --type <type>      Organization | LocalBusiness | Service (ProfessionalService deprecated)
  --window <100|500|full>
                     Local text scan window (default: 100 lexical words)
  --market <name>    Served market; repeatable
  --alias <name>     Alternate name; repeatable
  --profile <url>    Official profile URL supplied by you; repeatable
  --fact <text>      User-supplied fact; repeatable
  --street-address <x> --city <x> --region <x> --postal-code <x> --country <x>
  --email <address>  User-supplied contact email; repeatable
  --phone <number>   User-supplied contact telephone; repeatable
  --contact-type <x> Contact point type shared by CLI email/phone values
  --service <name>   User-supplied service name; repeatable
  --service-type <x> Service type for a primary --type Service
  --hours <json>     Opening-hours JSON object; repeatable
  --faq <Q::A>       User-written FAQ question and answer; repeatable
  --out-dir <dir>    Write local output files
  --report <md|html|both>  Add a local Markdown and/or HTML report (requires --out-dir)
  --json             Print JSON result
  --force            Allow replacing output files
  --help             Show this help
Privacy: local-only. No website fetching, network call or API is used.
Complex nested fields can also be supplied in the --input JSON file.`);}
function value(args:string[],i:number,flag:string):[string,number]{const v=args[i+1];if(!v||v.startsWith("--"))throw new Error(flag+" requires a value.");return[v,i+1];}
function parseWindow(value:string):AnalysisWindow {
  if(value==="100")return 100;
  if(value==="500")return 500;
  if(value==="full")return "full";
  throw new Error("Analysis window must be 100, 500, or full.");
}
function parseSchemaType(value:string):EntitySchemaType {
  if(value==="Organization"||value==="LocalBusiness"||value==="ProfessionalService"||value==="Service")return value;
  throw new Error("Type must be Organization, LocalBusiness, ProfessionalService, or Service.");
}
function parseHours(value:string):OpeningHoursSpecificationInput {
  const parsed=JSON.parse(value) as Partial<OpeningHoursSpecificationInput>;
  if(!parsed||typeof parsed!=="object"||!Array.isArray(parsed.dayOfWeek)||typeof parsed.opens!=="string"||typeof parsed.closes!=="string") {
    throw new Error("--hours expects JSON with dayOfWeek array, opens and closes strings.");
  }
  return {dayOfWeek:parsed.dayOfWeek,opens:parsed.opens,closes:parsed.closes,...(parsed.validFrom!==undefined?{validFrom:parsed.validFrom}:{}),...(parsed.validThrough!==undefined?{validThrough:parsed.validThrough}:{})};
}
function parseFaq(value:string):FAQItemInput {
  const separator=value.indexOf("::");
  if(separator<1||separator>=value.length-2)throw new Error("--faq expects Question::Answer.");
  return {question:value.slice(0,separator).trim(),answer:value.slice(separator+2).trim()};
}
function mergeCliFields(raw:EntityInput,extra:{
  schemaType?:EntitySchemaType;address:PostalAddressInput;emails:string[];phones:string[];contactType?:string;
  services:string[];serviceType?:string;hours:OpeningHoursSpecificationInput[];faqs:FAQItemInput[];
}):EntityInput {
  const address={...(raw.address??{})};
  for(const [key,value] of Object.entries(extra.address)){
    if(value)Object.assign(address,{[key]:value});
  }
  const contacts:ContactPointInput[]=[];
  const length=Math.max(extra.emails.length,extra.phones.length);
  for(let i=0;i<length;i++){
    const email=extra.emails[i],telephone=extra.phones[i];
    contacts.push({
      ...(email?{email}:{}),
      ...(telephone?{telephone}:{}),
      ...(extra.contactType?{contactType:extra.contactType}:{})
    });
  }
  return {
    ...raw,
    ...(extra.schemaType?{schemaType:extra.schemaType}:{}),
    ...(Object.keys(address).length?{address}:{}),
    ...(contacts.length?{contactPoints:[...(raw.contactPoints??[]),...contacts]}:{}),
    ...(extra.hours.length?{openingHours:[...(raw.openingHours??[]),...extra.hours]}:{}),
    ...(extra.services.length?{services:[...(raw.services??[]),...extra.services.map(name=>({name}))]}:{}),
    ...(extra.faqs.length?{faqs:[...(raw.faqs??[]),...extra.faqs]}:{}),
    ...(extra.serviceType?{serviceType:extra.serviceType}:{})
  };
}
async function main(){
  try{
    const args=process.argv.slice(2);
    let name="",text="",description="",url="",lang:SupportedLang="en",langSpecified=false,inputFile="",outDir="",asJson=false,force=false,window:AnalysisWindow=100,windowSpecified=false,reportFormat:"md"|"html"|"both"|undefined;
    let schemaType:EntitySchemaType|undefined,contactType:string|undefined,serviceType:string|undefined;
    const markets:string[]=[],aliases:string[]=[],profiles:string[]=[],facts:string[]=[],emails:string[]=[],phones:string[]=[],serviceNames:string[]=[];
    const hours:OpeningHoursSpecificationInput[]=[],faqs:FAQItemInput[]=[];
    const address:PostalAddressInput={};
    for(let i=0;i<args.length;i++){
      const a=args[i]!;
      if(a==="--help"||a==="-h"){help();return;}
      else if(a==="--json")asJson=true;
      else if(a==="--force")force=true;
      else if(a==="--input"){[inputFile,i]=value(args,i,a);}
      else if(a==="--text"){[text,i]=value(args,i,a);}
      else if(a==="--description"){[description,i]=value(args,i,a);}
      else if(a==="--url"){[url,i]=value(args,i,a);}
      else if(a==="--out-dir"){[outDir,i]=value(args,i,a);}
      else if(a==="--report"){const v=value(args,i,a);i=v[1];if(!["md","html","both"].includes(v[0]))throw new Error("Report format must be md, html, or both.");reportFormat=v[0] as "md"|"html"|"both";}
      else if(a==="--lang"){const v=value(args,i,a);i=v[1];if(!["ar","ku","en"].includes(v[0]))throw new Error("Language must be ar, ku or en.");lang=v[0] as SupportedLang;langSpecified=true;}
      else if(a==="--type"){const v=value(args,i,a);i=v[1];schemaType=parseSchemaType(v[0]);}
      else if(a==="--window"){const v=value(args,i,a);i=v[1];window=parseWindow(v[0]);windowSpecified=true;}
      else if(a==="--street-address"||a==="--city"||a==="--region"||a==="--postal-code"||a==="--country"||a==="--contact-type"||a==="--service-type"){
        const v=value(args,i,a);i=v[1];
        if(a==="--street-address")address.streetAddress=v[0];
        else if(a==="--city")address.addressLocality=v[0];
        else if(a==="--region")address.addressRegion=v[0];
        else if(a==="--postal-code")address.postalCode=v[0];
        else if(a==="--country")address.addressCountry=v[0];
        else if(a==="--contact-type")contactType=v[0];
        else serviceType=v[0];
      }
      else if(["--market","--alias","--profile","--fact","--email","--phone","--service","--hours","--faq"].includes(a)){
        const v=value(args,i,a);i=v[1];
        if(a==="--market")markets.push(v[0]);
        else if(a==="--alias")aliases.push(v[0]);
        else if(a==="--profile")profiles.push(v[0]);
        else if(a==="--fact")facts.push(v[0]);
        else if(a==="--email")emails.push(v[0]);
        else if(a==="--phone")phones.push(v[0]);
        else if(a==="--service")serviceNames.push(v[0]);
        else if(a==="--hours")hours.push(parseHours(v[0]));
        else faqs.push(parseFaq(v[0]));
      }
      else if(a.startsWith("--"))throw new Error("Unknown option: "+a);
      else if(!name)name=a;
      else throw new Error("Unexpected argument: "+a);
    }

    const cliFields={...(schemaType?{schemaType}:{}),address,emails,phones,...(contactType?{contactType}:{}),services:serviceNames,...(serviceType?{serviceType}:{}),hours,faqs};
    let input:EntityInput;
    if(inputFile){
      const raw=JSON.parse(await readFile(resolve(inputFile),"utf8")) as EntityInput;
      const merged=mergeCliFields(raw,cliFields);
      input={
        ...merged,
        ...(text?{headText:text}:{}),
        ...(description?{description}:{}),
        ...(url?{url}:{}),
        ...(markets.length?{markets:[...(raw.markets||[]),...markets]}:{}),
        ...(aliases.length?{aliases:[...(raw.aliases||[]),...aliases]}:{}),
        ...(profiles.length?{officialProfiles:[...(raw.officialProfiles||[]),...profiles]}:{}),
        ...(facts.length?{facts:[...(raw.facts||[]),...facts]}:{}),
        ...(langSpecified?{lang}:{}),
        ...(windowSpecified?{window}:{})
      };
    }else{
      if(!name)throw new Error("Provide an entity name or --input JSON.");
      input=mergeCliFields({name,headText:text,description,url,lang,window,markets,aliases,officialProfiles:profiles,facts},cliFields);
    }
    const result=auditEntity(input);
    if(reportFormat&&!outDir)throw new Error("--report requires --out-dir.");
    if(outDir){
      const folder=resolve(outDir);await mkdir(folder,{recursive:true});
      const outputs:[string,string][]=[["audit-report.json",JSON.stringify(result,null,2)+"\n"],["organization.jsonld",JSON.stringify(result.machinePack.jsonLd,null,2)+"\n"],["llms.txt",result.machinePack.llmsTxt]];
      if(reportFormat){const reports=generateEntityReports(input,result);if(reportFormat==="md"||reportFormat==="both")outputs.push(["entity-report.md",reports.markdown+"\n"]);if(reportFormat==="html"||reportFormat==="both")outputs.push(["entity-report.html",reports.html]);}
      if(!force){const existing:string[]=[];for(const [file] of outputs){try{await access(join(folder,file),constants.F_OK);existing.push(file);}catch{}}if(existing.length)throw new Error("Refusing to overwrite: "+existing.join(", ")+". Use --force to replace.");}
      for(const [file,content] of outputs)await writeFile(join(folder,file),content,{encoding:"utf8",flag:force?"w":"wx"});
    }
    if(asJson)console.log(JSON.stringify(result,null,2));
    else {
      const scanLabel=window==="full"?"all supplied text":`first ${window} words`;
      console.log("ENTITY TRUTH CORE — "+result.entity);
      console.log("Schema.org type: "+String(result.machinePack.jsonLd["@type"]));
      console.log("Language: "+result.language);
      console.log("Candidate signals: "+result.factDensity.candidateSignalCount+" ("+scanLabel+")");
      console.log("Name hints: "+result.disambiguation.heuristicRisk);
      console.log("Notice: local heuristic only; no global search, external verification or AI visibility measurement.");
      if(outDir)console.log("Files saved to "+resolve(outDir));
      if(reportFormat)console.log("Report format: "+reportFormat);
      if(reportFormat)console.log("Report format: "+reportFormat);
    }
  }catch(e){console.error("entity-truth: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
}
await main();
