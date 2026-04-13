import Anthropic from "@anthropic-ai/sdk";
import { PromptBuilder } from "./PromptBuilder";
import logger from "../utils/logger";

export type Verdict = "PASS" | "FAIL" | "UNCERTAIN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface InvariantCheckResult {
  invariantId: number;
  verdict: Verdict;
  reasoning: string;
  riskLevel: RiskLevel;
  suggestedMitigation: string | null;
}

export interface SeveritySummary {
  total: number;
  passed: number;
  failed: number;
  uncertain: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export class InvariantChecker {
  private client: Anthropic;
  private promptBuilder: PromptBuilder;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.promptBuilder = new PromptBuilder();
  }

  async checkAll(
    invariants: Array<{ id: number; text: string }>,
    currentCode: string,
    diff: string
  ): Promise<InvariantCheckResult[]> {
    if (invariants.length === 0) {
      logger.info("[InvariantChecker] No invariants to check");
      return [];
    }

    const systemPrompt = this.promptBuilder.buildInvariantCheckSystemPrompt(currentCode, diff);
    const userPrompt = this.promptBuilder.buildInvariantCheckUserPrompt(invariants);

    logger.info(`[InvariantChecker] Checking ${invariants.length} invariants`);

    const message = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    return this.parseResults(text, invariants);
  }

  async checkSingle(
    invariant: { id: number; text: string },
    currentCode: string,
    diff: string
  ): Promise<InvariantCheckResult> {
    const results = await this.checkAll([invariant], currentCode, diff);
    return results[0];
  }

  isAllClear(results: InvariantCheckResult[]): boolean {
    return results.every(r => r.verdict === "PASS");
  }

  getSeveritySummary(results: InvariantCheckResult[]): SeveritySummary {
    const summary: SeveritySummary = {
      total: results.length,
      passed: 0,
      failed: 0,
      uncertain: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const r of results) {
      if (r.verdict === "PASS") summary.passed++;
      else if (r.verdict === "FAIL") summary.failed++;
      else summary.uncertain++;

      if (r.riskLevel === "CRITICAL") summary.critical++;
      else if (r.riskLevel === "HIGH") summary.high++;
      else if (r.riskLevel === "MEDIUM") summary.medium++;
      else summary.low++;
    }
    return summary;
  }

  private parseResults(
    text: string,
    invariants: Array<{ id: number; text: string }>
  ): InvariantCheckResult[] {
    const cleaned = text.replace(/^```json\s*/m, "").replace(/\s*```$/m, "").trim();
    let parsed: InvariantCheckResult[];
    try {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array in response");
      parsed = JSON.parse(match[0]) as InvariantCheckResult[];
    } catch {
      logger.warn("[InvariantChecker] Failed to parse AI response, marking all UNCERTAIN");
      return invariants.map(inv => ({
        invariantId: inv.id,
        verdict: "UNCERTAIN" as Verdict,
        reasoning: "AI response could not be parsed",
        riskLevel: "HIGH" as RiskLevel,
        suggestedMitigation: "Manual review required",
      }));
    }
    // Ensure we have results for every invariant
    return invariants.map(inv => {
      const found = parsed.find(r => r.invariantId === inv.id);
      if (found) return found;
      return {
        invariantId: inv.id,
        verdict: "UNCERTAIN" as Verdict,
        reasoning: "No result returned for this invariant",
        riskLevel: "HIGH" as RiskLevel,
        suggestedMitigation: "Manual review required",
      };
    });
  }
}
