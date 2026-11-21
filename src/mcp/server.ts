#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { executeEntityNameHint, executeEntityProfileGenerate, executeEntityProfileValidate, executeEntityScan } from "./tools.js";
import type { EntityInput, SupportedLang } from "../types.js";

const entityInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.string().max(2048).optional(),
  description: z.string().max(5000).optional(),
  headText: z.string().max(100000).optional(),
  aliases: z.array(z.string().max(200)).max(100).optional(),
  knowsLanguages: z.array(z.string().max(80)).max(50).optional(),
  markets: z.array(z.string().max(120)).max(100).optional(),
  officialProfiles: z.array(z.string().max(2048)).max(100).optional(),
  facts: z.array(z.string().max(2000)).max(100).optional(),
  lang: z.enum(["ar", "ku", "en"]).optional(),
});

type EntityInputSchema = z.infer<typeof entityInputSchema>;

function toEntityInput(input: EntityInputSchema): EntityInput {
  return {
    name: input.name,
    ...(input.url !== undefined ? { url: input.url } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.headText !== undefined ? { headText: input.headText } : {}),
    ...(input.aliases !== undefined ? { aliases: input.aliases } : {}),
    ...(input.knowsLanguages !== undefined ? { knowsLanguages: input.knowsLanguages } : {}),
    ...(input.markets !== undefined ? { markets: input.markets } : {}),
    ...(input.officialProfiles !== undefined ? { officialProfiles: input.officialProfiles } : {}),
    ...(input.facts !== undefined ? { facts: input.facts } : {}),
    ...(input.lang !== undefined ? { lang: input.lang as SupportedLang } : {}),
  };
}

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function errorResult(error: unknown) {
  return {
    isError: true,
    content: [{
      type: "text" as const,
      text: error instanceof Error ? error.message : "Unknown Entity Truth Core error.",
    }],
  };
}

function safelyRun<T>(operation: () => T) {
  try {
    return textResult(operation());
  } catch (error) {
    return errorResult(error);
  }
}

export function createEntityTruthMcpServer() {
  const server = new McpServer({
    name: "entity-truth-core-by-maaroof-ai",
    version: "0.1.0",
  });

  server.registerTool(
    "entity_scan",
    {
      description: "Run the complete local Entity Truth Core audit: first-100-word candidate scan, limited name hint, and draft machine-readable profile. No network calls or independent fact verification.",
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
      description: "Generate draft Schema.org Organization JSON-LD and an llms.txt-style profile only from user-supplied fields. Supplied facts, markets and links are not independently verified.",
      inputSchema: entityInputSchema,
    },
    async (input) => safelyRun(() => executeEntityProfileGenerate(toEntityInput(input))),
  );

  server.registerTool(
    "entity_profile_validate",
    {
      description: "Perform a limited local structural check on an Organization JSON-LD object. This is not full Schema.org validation and does not verify the entity.",
      inputSchema: z.object({
        jsonLd: z.record(z.string(), z.unknown()),
      }),
    },
    async ({ jsonLd }) => safelyRun(() => executeEntityProfileValidate(jsonLd)),
  );

  return server;
}

const handle = serveStdio(() => createEntityTruthMcpServer());
process.once("SIGINT", () => { void handle.close(); });
process.once("SIGTERM", () => { void handle.close(); });
