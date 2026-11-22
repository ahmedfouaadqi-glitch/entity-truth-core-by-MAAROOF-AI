import { auditEntity, checkDisambiguation, generateMachinePack } from "../index.js";
import { validateEntityProfile } from "../validator.js";
import type { EntityInput, SupportedLang } from "../types.js";

export function executeEntityScan(input: EntityInput) {
  return auditEntity(input);
}

export function executeEntityNameHint(input: { name: string; lang?: SupportedLang }) {
  return checkDisambiguation(input.name, input.lang ?? "en");
}

export function executeEntityProfileGenerate(input: EntityInput) {
  return generateMachinePack(input);
}

export function executeEntityProfileValidate(jsonLd: unknown, lang: SupportedLang = "en") {
  return validateEntityProfile(jsonLd, lang);
}
