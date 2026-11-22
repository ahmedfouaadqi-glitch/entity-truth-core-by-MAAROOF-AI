#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { executeEntityNameHint, executeEntityProfileGenerate, executeEntityProfileValidate, executeEntityScan } from "./tools.js";
import type { AnalysisWindow, EntityInput, SupportedLang } from "../types.js";

const entityInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  schemaType: z.enum(["Organization","LocalBusiness","ProfessionalService","Service"]).optional(),
  url: z.string().max(2048).optional(),
  description: z.string().max(5000).optional(),
  headText: z.string().max(100000).optional(),
  window: z.union([z.literal(100), z.literal(500), z.literal("full")]).optional(),
  aliases: z.array(z.string().max(200)).max(100).optional(),
  knowsLanguages: z.array(z.string().max(80)).max(50).optional(),
  markets: z.array(z.string().max(120)).max(100).optional(),
  officialProfiles: z.array(z.string().max(2048)).max(100).optional(),
  facts: z.array(z.string().max(2000)).max(100).optional(),
  address: z.object({
    streetAddress: z.string().max(300).optional(),
    addressLocality: z.string().max(120).optional(),
    addressRegion: z.string().max(120).optional(),
    postalCode: z.string().max(40).optional(),
    addressCountry: z.string().max(80).optional(),
  }).optional(),
  contactPoints: z.array(z.object({
    contactType: z.string().max(120).optional(),
    telephone: z.string().max(80).optional(),
    email: z.string().max(254).optional(),
    availableLanguage: z.array(z.string().max(80)).max(20).optional(),
  })).max(20).optional(),
  openingHours: z.array(z.object({
    dayOfWeek: z.array(z.string().max(20)).max(7),
    opens: z.string().max(5),
    closes: z.string().max(5),
    validFrom: z.string().max(10).optional(),
    validThrough: z.string().max(10).optional(),
  })).max(50).optional(),
  services: z.array(z.object({
    name: z.string().max(200),
    description: z.string().max(1000).optional(),
    serviceType: z.string().max(120).optional(),
  })).max(100).optional(),
  faqs: z.array(z.object({
    question: z.string().max(500),
    answer: z.string().max(3000),
  })).max(100).optional(),
  serviceType: z.string().max(120).optional(),
  lang: z.enum(["ar", "ku", "en"]).optional(),
});

type EntityInputSchema = z.infer<typeof entityInputSchema>;

function toEntityInput(input: EntityInputSchema): EntityInput {
  return {
    name: input.name,
    ...(input.schemaType !== undefined ? { schemaType: input.schemaType } : {}),
    ...(input.url !== undefined ? { url: input.url } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.headText !== undefined ? { headText: input.headText } : {}),
    ...(input.window !== undefined ? { window: input.window as AnalysisWindow } : {}),
    ...(input.aliases !== undefined ? { aliases: input.aliases } : {}),
    ...(input.knowsLanguages !== undefined ? { knowsLanguages: input.knowsLanguages } : {}),
    ...(input.markets !== undefined ? { markets: input.markets } : {}),
    ...(input.officialProfiles !== undefined ? { officialProfiles: input.officialProfiles } : {}),
    ...(input.facts !== undefined ? { facts: input.facts } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.contactPoints !== undefined ? { contactPoints: input.contactPoints } : {}),
    ...(input.openingHours !== undefined ? { openingHours: input.openingHours } : {}),
    ...(input.services !== undefined ? { services: input.services } : {}),
    ...(input.faqs !== undefined ? { faqs: input.faqs } : {}),
    ...(input.serviceType !== undefined ? { serviceType: input.serviceType } : {}),
    ...(input.lang !== undefined ? { lang: input.lang as SupportedLang } : {}),
  };
}

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}
function errorResult(error: unknown) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Unknown Entity Truth Core error." }],
  };
}
function safelyRun<T>(operation: () => T) {
  try { return textResult(operation()); }
  catch (error) { return errorResult(error); }
}

export function createEntityTruthMcpServer() {
  const server = new McpServer({
    name: "entity-truth-core-by-maaroof-ai",
    version: "0.1.0",
  });

  server.registerTool(
    "entity_scan",
    {
      description: "Run the complete local Entity Truth Core audit with selectable 100, 500, or full text scanning, a limited name hint, and a draft Schema.org profile. Supported primary types: Organization, LocalBusiness, ProfessionalService, Service. Nested contact, address, hours, services and FAQ fields must be user supplied. No network calls or independent verification.",
      inputSchema: entityInputSchema,
    },
    async (input) => safelyRun(() => executeEntityScan(toEntityInput(input))),
  );

  server.registerTool(
    "entity_name_hint",
    {
      description: "Check a name against the limited built-in Arabic, Sorani Kurdish or English word list. This is not a global name-collision search or uniqueness check.",
      inputSchema: z.object({
        name: z.string().trim().min(1).max(200),
        lang: z.enum(["ar", "ku", "en"]).optional(),
      }),
    },
    async (input) => safelyRun(() => executeEntityNameHint({
      name: input.name,
      ...(input.lang !== undefined ? { lang: input.lang as SupportedLang } : {}),
    })),
  );

  server.registerTool(
    "entity_profile_generate",
    {
      description: "Generate draft Organization, LocalBusiness, ProfessionalService or Service JSON-LD plus an llms.txt-style profile from user-supplied fields only. Contact, address, hours, services, FAQs, facts, markets and links are not independently verified.",
      inputSchema: entityInputSchema,
    },
    async (input) => safelyRun(() => executeEntityProfileGenerate(toEntityInput(input))),
  );

  server.registerTool(
    "entity_profile_validate",
    {
      description: "Perform a limited local structural check of supported Organization, LocalBusiness, ProfessionalService, Service or FAQPage JSON-LD. Supports localized English and Arabic validation messages. This is not full Schema.org validation and does not verify entity facts or ownership.",
      inputSchema: z.object({
        jsonLd: z.record(z.string(), z.unknown()),
        lang: z.enum(["ar","ku","en"]).optional(),
      }),
    },
    async ({ jsonLd, lang }) => safelyRun(() => executeEntityProfileValidate(jsonLd, lang as SupportedLang | undefined)),
  );

  return server;
}

const handle = serveStdio(() => createEntityTruthMcpServer());
process.once("SIGINT", () => { void handle.close(); });
process.once("SIGTERM", () => { void handle.close(); });
