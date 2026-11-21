export type SupportedLang = "ar" | "ku" | "en";
export type HeuristicRisk = "low" | "medium" | "high" | "unknown";

export interface EntityInput {
  /** Canonical entity or brand name supplied by the user. */
  name: string;
  /** Official website URL supplied by the user. It is not fetched by this package. */
  url?: string;
  /** Short description supplied by the user. */
  description?: string;
  /** Opening text to inspect. Only the first 100 lexical words are scanned. */
  headText?: string;
  /** User-supplied alternate names. */
  aliases?: string[];
  /** User-supplied languages the entity operates in. None are assumed by default. */
  knowsLanguages?: string[];
  /** User-supplied markets served. No market is assumed by default. */
  markets?: string[];
  /** User-supplied official profile URLs. This package does not verify ownership. */
  officialProfiles?: string[];
  /** Facts supplied by the user. They are never labelled independently verified. */
  facts?: string[];
  lang?: SupportedLang;
}

export interface FactSignal {
  category: "year" | "percentage" | "standard" | "scale" | "currency";
  value: string;
}

export interface FactDensityReport {
  method: "heuristic-pattern-scan";
  maxWords: 100;
  totalWordsAnalyzed: number;
  candidateSignalCount: number;
  candidateSignals: FactSignal[];
  signalDensity: number;
  heuristicScore: number;
  interpretation: string;
  limitations: string[];
}

export interface DisambiguationCheck {
  entityName: string;
  normalizedName: string;
  heuristicRisk: HeuristicRisk;
  exactCommonTermMatch: boolean;
  matchedCommonTerms: string[];
  shortNameSignal: boolean;
  lexiconCoverage: "limited-static-lexicon";
  limitations: string[];
  recommendation: string;
}

export interface MachinePack {
  jsonLd: Record<string, unknown>;
  llmsTxt: string;
  warnings: string[];
}

export interface EntityAuditResult {
  entity: string;
  timestamp: string;
  language: SupportedLang;
  factDensity: FactDensityReport;
  disambiguation: DisambiguationCheck;
  machinePack: MachinePack;
  scopeNotice: string[];
}
