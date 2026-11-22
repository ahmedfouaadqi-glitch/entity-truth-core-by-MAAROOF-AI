import type {
  AnalysisWindow,
  ContactPointInput,
  EntityInput,
  EntitySchemaType,
  FAQItemInput,
  OpeningHoursSpecificationInput,
  PostalAddressInput,
  SupportedLang
} from "./types.js";

export interface CsvBatchRow {
  rowNumber: number;
  input?: EntityInput;
  error?: string;
}

export interface CsvBatchParseResult {
  headers: string[];
  rows: CsvBatchRow[];
}

interface CsvRecord {
  rowNumber: number;
  cells: string[];
}

const HEADER_ALIASES:Record<string,string>={
  entityname:"name",
  companyname:"name",
  website:"url",
  websiteurl:"url",
  alternatename:"aliases",
  servedmarkets:"markets",
  entitylanguages:"knowslanguages",
  openinghoursspecification:"openinghours",
  servicelist:"services",
  contactemail:"contactemail",
  contactphone:"contactphone",
  contactlanguages:"contactlanguages",
  faqitems:"faqs"
};

const SUPPORTED_HEADERS=new Set([
  "name","schematype","url","description","headtext","lang","window",
  "aliases","markets","knowslanguages","officialprofiles","facts",
  "streetaddress","addresslocality","addressregion","postalcode","addresscountry",
  "contacttype","contactemail","contactphone","contactlanguages",
  "services","servicetype","openinghours","faqs"
]);

function parseMatrix(source:string):CsvRecord[] {
  const input=source.startsWith("\uFEFF")?source.slice(1):source;
  const records:CsvRecord[]=[];
  let cells:string[]=[];
  let field="";
  let inQuotes=false;
  let quoteClosed=false;
  let line=1;
  let recordStartLine=1;

  const pushField=()=>{cells.push(field);field="";quoteClosed=false;};
  const pushRecord=()=>{
    pushField();
    if(cells.some(cell=>cell.trim().length>0))records.push({rowNumber:recordStartLine,cells});
    cells=[];
    recordStartLine=line;
  };

  for(let i=0;i<input.length;i++){
    const character=input[i]!;
    if(inQuotes){
      if(character==='"'){
        if(input[i+1]==='"'){field+='"';i++;}
        else{inQuotes=false;quoteClosed=true;}
      }else if(character==="\r"){
        if(input[i+1]==="\n"){field+="\n";i++;}
        else field+="\n";
        line++;
      }else if(character==="\n"){
        field+="\n";
        line++;
      }else field+=character;
      continue;
    }

    if(quoteClosed){
      if(character===" "||character==="\t")continue;
      if(character===","){pushField();continue;}
      if(character==="\n"){pushRecord();line++;recordStartLine=line;continue;}
      if(character==="\r"){if(input[i+1]==="\n")i++;pushRecord();line++;recordStartLine=line;continue;}
      throw new Error("CSV syntax error near physical line "+line+": unexpected character after a closing quote.");
    }

    if(character==='"'){
      if(field.length!==0)throw new Error("CSV syntax error near physical line "+line+": a quote must start at the beginning of a field.");
      inQuotes=true;
    }else if(character===",")pushField();
    else if(character==="\n"){pushRecord();line++;recordStartLine=line;}
    else if(character==="\r"){if(input[i+1]==="\n")i++;pushRecord();line++;recordStartLine=line;}
    else field+=character;
  }

  if(inQuotes)throw new Error("CSV syntax error: an opening quote was not closed.");
  if(field.length>0||cells.length>0)pushRecord();
  return records;
}

function normalizeHeader(value:string):string {
  const compact=value.trim().toLowerCase().replace(/[\s_-]+/g,"");
  return HEADER_ALIASES[compact]??compact;
}
function cell(record:CsvRecord,columns:Map<string,number>,name:string):string {
  const index=columns.get(name);
  return index===undefined?"":(record.cells[index]??"").trim();
}
function list(value:string,fieldName:string,rowNumber:number):string[] {
  if(!value)return [];
  return value.split("|").map(item=>item.trim()).filter(Boolean);
}
function isRecord(value:unknown):value is Record<string,unknown> {
  return typeof value==="object" && value!==null && !Array.isArray(value);
}
function parseOpeningHours(value:string,rowNumber:number):OpeningHoursSpecificationInput[] {
  const items=jsonArray<unknown>(value,"openingHours",rowNumber);
  for(const item of items){
    if(!isRecord(item)||!Array.isArray(item.dayOfWeek)||item.dayOfWeek.length===0||
      item.dayOfWeek.some(day=>typeof day!=="string")||
      typeof item.opens!=="string"||typeof item.closes!=="string"||
      (item.validFrom!==undefined&&typeof item.validFrom!=="string")||
      (item.validThrough!==undefined&&typeof item.validThrough!=="string")){
      throw new Error("Row "+rowNumber+": each openingHours item needs a dayOfWeek string array, opens and closes strings.");
    }
  }
  return items as OpeningHoursSpecificationInput[];
}
function parseFaqs(value:string,rowNumber:number):FAQItemInput[] {
  const items=jsonArray<unknown>(value,"faqs",rowNumber);
  for(const item of items){
    if(!isRecord(item)||typeof item.question!=="string"||!item.question.trim()||
      typeof item.answer!=="string"||!item.answer.trim()){
      throw new Error("Row "+rowNumber+": each FAQ item needs a non-empty question and answer.");
    }
  }
  return items as FAQItemInput[];
}
function jsonArray<T>(value:string,label:string,rowNumber:number):T[] {
  if(!value)return [];
  let parsed:unknown;
  try{parsed=JSON.parse(value);}
  catch{throw new Error("Row "+rowNumber+": "+label+" must be a valid JSON array.");}
  if(!Array.isArray(parsed))throw new Error("Row "+rowNumber+": "+label+" must be a JSON array.");
  return parsed as T[];
}
function schemaType(value:string,rowNumber:number):EntitySchemaType|undefined {
  if(!value)return undefined;
  if(value==="Organization"||value==="LocalBusiness"||value==="ProfessionalService"||value==="Service")return value;
  throw new Error("Row "+rowNumber+": schemaType must be Organization, LocalBusiness, ProfessionalService, or Service.");
}
function language(value:string,rowNumber:number):SupportedLang|undefined {
  if(!value)return undefined;
  if(value==="ar"||value==="ku"||value==="en")return value;
  throw new Error("Row "+rowNumber+": lang must be ar, ku, or en.");
}
function windowSize(value:string,rowNumber:number):AnalysisWindow|undefined {
  if(!value)return undefined;
  if(value==="100")return 100;
  if(value==="500")return 500;
  if(value==="full")return "full";
  throw new Error("Row "+rowNumber+": window must be 100, 500, or full.");
}
function mapRow(record:CsvRecord,columns:Map<string,number>):EntityInput {
  const row=record.rowNumber;
  const name=cell(record,columns,"name");
  if(!name)throw new Error("Row "+row+": name is required.");
  if(name.length>200)throw new Error("Row "+row+": name must not exceed 200 characters.");

  const address:PostalAddressInput={
    ...(cell(record,columns,"streetaddress")?{streetAddress:cell(record,columns,"streetaddress")}:{ }),
    ...(cell(record,columns,"addresslocality")?{addressLocality:cell(record,columns,"addresslocality")}:{ }),
    ...(cell(record,columns,"addressregion")?{addressRegion:cell(record,columns,"addressregion")}:{ }),
    ...(cell(record,columns,"postalcode")?{postalCode:cell(record,columns,"postalcode")}:{ }),
    ...(cell(record,columns,"addresscountry")?{addressCountry:cell(record,columns,"addresscountry")}:{ })
  };
  const contactEmail=cell(record,columns,"contactemail");
  const contactPhone=cell(record,columns,"contactphone");
  const contactType=cell(record,columns,"contacttype");
  const contactLanguages=list(cell(record,columns,"contactlanguages"),"contactLanguages",row);
  const contactPoints:ContactPointInput[]=[];
  if(contactEmail||contactPhone||contactType){
    contactPoints.push({
      ...(contactEmail?{email:contactEmail}:{}),
      ...(contactPhone?{telephone:contactPhone}:{}),
      ...(contactType?{contactType}:{}),
      ...(contactLanguages.length?{availableLanguage:contactLanguages}:{})
    });
  }

  const aliases=list(cell(record,columns,"aliases"),"aliases",row);
  const markets=list(cell(record,columns,"markets"),"markets",row);
  const knowsLanguages=list(cell(record,columns,"knowslanguages"),"knowsLanguages",row);
  const officialProfiles=list(cell(record,columns,"officialprofiles"),"officialProfiles",row);
  const facts=list(cell(record,columns,"facts"),"facts",row);
  const services=list(cell(record,columns,"services"),"services",row).map(service=>({name:service}));
  const openingHours=parseOpeningHours(cell(record,columns,"openinghours"),row);
  const faqs=parseFaqs(cell(record,columns,"faqs"),row);
  const serviceType=cell(record,columns,"servicetype");
  const url=cell(record,columns,"url");
  const description=cell(record,columns,"description");
  const headText=cell(record,columns,"headtext");
  const selectedSchemaType=schemaType(cell(record,columns,"schematype"),row);
  const selectedLanguage=language(cell(record,columns,"lang"),row);
  const selectedWindow=windowSize(cell(record,columns,"window"),row);

  return {
    name,
    ...(selectedSchemaType?{schemaType:selectedSchemaType}:{}),
    ...(url?{url}:{}),
    ...(description?{description}:{}),
    ...(headText?{headText}:{}),
    ...(selectedWindow?{window:selectedWindow}:{}),
    ...(aliases.length?{aliases}:{}),
    ...(markets.length?{markets}:{}),
    ...(knowsLanguages.length?{knowsLanguages}:{}),
    ...(officialProfiles.length?{officialProfiles}:{}),
    ...(facts.length?{facts}:{}),
    ...(Object.values(address).some(Boolean)?{address}:{}),
    ...(contactPoints.length?{contactPoints}:{}),
    ...(openingHours.length?{openingHours}:{}),
    ...(services.length?{services}:{}),
    ...(faqs.length?{faqs}:{}),
    ...(serviceType?{serviceType}:{}),
    ...(selectedLanguage?{lang:selectedLanguage}:{})
  };
}

/**
 * Parse a local CSV file into independent entity input rows.
 * Lists use | as their separator; openingHours and faqs use JSON arrays.
 * Invalid rows are returned as row-level errors instead of stopping valid rows.
 */
export function parseEntityCsv(source:string):CsvBatchParseResult {
  if(typeof source!=="string"||!source.trim())throw new Error("CSV input is empty.");
  const records=parseMatrix(source);
  if(records.length===0)throw new Error("CSV input contains no header row.");
  const headerRecord=records[0]!;
  const headers=headerRecord.cells.map(normalizeHeader);
  if(headers.some(header=>!header))throw new Error("CSV header names cannot be empty.");
  const duplicates=headers.filter((header,index)=>headers.indexOf(header)!==index);
  if(duplicates.length)throw new Error("CSV contains duplicate column headers: "+[...new Set(duplicates)].join(", ")+".");
  const unknown=headers.filter(header=>!SUPPORTED_HEADERS.has(header));
  if(unknown.length)throw new Error("Unsupported CSV columns: "+unknown.join(", ")+".");
  if(!headers.includes("name"))throw new Error("CSV requires a name column.");

  const columns=new Map(headers.map((header,index)=>[header,index]));
  const rows:CsvBatchRow[]=[];
  for(const record of records.slice(1)){
    if(record.cells.length>headers.length && record.cells.slice(headers.length).some(value=>value.trim())){
      rows.push({rowNumber:record.rowNumber,error:"Row "+record.rowNumber+": contains more fields than the CSV header."});
      continue;
    }
    try{
      const padded={...record,cells:Array.from({length:headers.length},(_,index)=>record.cells[index]??"")};
      const input=mapRow(padded,columns);
      rows.push({rowNumber:record.rowNumber,input});
    }catch(error){
      rows.push({rowNumber:record.rowNumber,error:error instanceof Error?error.message:"Unknown row parsing error."});
    }
  }
  return {headers,rows};
}
