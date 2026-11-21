#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { auditEntity } from "./index.js";
import type { EntityInput, SupportedLang } from "./types.js";

function help(){console.log(`Entity Truth Core — local entity profile checker
Usage:
  entity-truth "Entity name" --text "Opening description" [options]
  entity-truth --input ./entity.json [options]
Options:
  --url <url>        Official website URL (not fetched)
  --description <x>  Entity description
  --lang <ar|ku|en>  Output language (default: en)
  --market <name>    Served market; repeatable
  --alias <name>     Alternate name; repeatable
  --profile <url>    Official profile URL supplied by you; repeatable
  --fact <text>      User-supplied fact; repeatable
  --out-dir <dir>    Write JSON, JSON-LD and llms.txt files
  --json             Print JSON result
  --force            Allow replacing output files
  --help             Show this help
Privacy: local-only. No website fetching, network call or API is used.`);}
function value(args:string[],i:number,flag:string):[string,number]{const v=args[i+1];if(!v||v.startsWith("--"))throw new Error(flag+" requires a value.");return[v,i+1];}
async function main(){
  try{
    const args=process.argv.slice(2);let name="",text="",description="",url="",lang:SupportedLang="en",langSpecified=false,inputFile="",outDir="",asJson=false,force=false;
    const markets:string[]=[],aliases:string[]=[],profiles:string[]=[],facts:string[]=[];
    for(let i=0;i<args.length;i++){
      const a=args[i]!;
      if(a==="--help"||a==="-h"){help();return;}else if(a==="--json")asJson=true;else if(a==="--force")force=true;
      else if(a==="--input"){[inputFile,i]=value(args,i,a);}else if(a==="--text"){[text,i]=value(args,i,a);}
      else if(a==="--description"){[description,i]=value(args,i,a);}else if(a==="--url"){[url,i]=value(args,i,a);}
      else if(a==="--out-dir"){[outDir,i]=value(args,i,a);}else if(a==="--lang"){const v=value(args,i,a);i=v[1];if(!["ar","ku","en"].includes(v[0]))throw new Error("Language must be ar, ku or en.");lang=v[0] as SupportedLang;langSpecified=true;}
      else if(["--market","--alias","--profile","--fact"].includes(a)){const v=value(args,i,a);i=v[1];({ "--market":markets,"--alias":aliases,"--profile":profiles,"--fact":facts } as Record<string,string[]>)[a]!.push(v[0]);}
      else if(a.startsWith("--"))throw new Error("Unknown option: "+a);else if(!name)name=a;else throw new Error("Unexpected argument: "+a);
    }
    let input:EntityInput;
    if(inputFile){const raw=JSON.parse(await readFile(resolve(inputFile),"utf8")) as EntityInput;input={...raw,...(text?{headText:text}:{}),...(description?{description}:{}),...(url?{url}:{}),...(markets.length?{markets:[...(raw.markets||[]),...markets]}:{}),...(aliases.length?{aliases:[...(raw.aliases||[]),...aliases]}:{}),...(profiles.length?{officialProfiles:[...(raw.officialProfiles||[]),...profiles]}:{}),...(facts.length?{facts:[...(raw.facts||[]),...facts]}:{}),...(langSpecified?{lang}:{})};}
    else {if(!name)throw new Error("Provide an entity name or --input JSON.");input={name,headText:text,description,url,lang,markets,aliases,officialProfiles:profiles,facts};}
    const result=auditEntity(input);
    if(outDir){
      const folder=resolve(outDir);await mkdir(folder,{recursive:true});
      const outputs:[string,string][]=[["audit-report.json",JSON.stringify(result,null,2)+"\n"],["organization.jsonld",JSON.stringify(result.machinePack.jsonLd,null,2)+"\n"],["llms.txt",result.machinePack.llmsTxt]];
      if(!force){const existing:string[]=[];for(const [file] of outputs){try{await access(join(folder,file),constants.F_OK);existing.push(file);}catch{}}if(existing.length)throw new Error("Refusing to overwrite: "+existing.join(", ")+". Use --force to replace.");}
      for(const [file,content] of outputs)await writeFile(join(folder,file),content,{encoding:"utf8",flag:force?"w":"wx"});
    }
    if(asJson)console.log(JSON.stringify(result,null,2));else {console.log("ENTITY TRUTH CORE — "+result.entity);console.log("Language: "+result.language);console.log("Candidate signals: "+result.factDensity.candidateSignalCount+" (first 100 words)");console.log("Name hints: "+result.disambiguation.heuristicRisk);console.log("Notice: heuristic only; no global search or AI visibility measurement.");if(outDir)console.log("Files saved to "+resolve(outDir));}
  }catch(e){console.error("entity-truth: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
}
await main();
