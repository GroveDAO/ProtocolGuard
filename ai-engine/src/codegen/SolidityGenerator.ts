import Anthropic from "@anthropic-ai/sdk";
import { PromptBuilder, ProposalContext, ProtocolContext } from "./PromptBuilder";
import logger from "../utils/logger";

export interface GeneratedCode {
  diff: string;
  changedFunctions: string[];
  newVariables: string[];
  reasoning: string;
  confidence: number;
  warnings: string[];
}

const MAX_RETRIES = 3;
const MIN_CONFIDENCE = 60;

export class SolidityGenerator {
  private client: Anthropic;
  private promptBuilder: PromptBuilder;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.promptBuilder = new PromptBuilder();
  }

  async generate(
    proposal: ProposalContext,
    protocol: ProtocolContext
  ): Promise<GeneratedCode> {
    const systemPrompt = this.promptBuilder.buildCodegenSystemPrompt(protocol);
    const userPrompt = this.promptBuilder.buildCodegenUserPrompt(proposal);

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[SolidityGenerator] Attempt ${attempt}/${MAX_RETRIES} for proposal ${proposal.id}`);
        const result = await this.callClaude(systemPrompt, userPrompt);
        if (result.confidence < MIN_CONFIDENCE) {
          throw new Error(
            `AI confidence ${result.confidence} below minimum threshold ${MIN_CONFIDENCE}`
          );
        }
        this.validateDiff(result.diff);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(`[SolidityGenerator] Attempt ${attempt} failed: ${lastError.message}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    throw lastError ?? new Error("Code generation failed after all retries");
  }

  async fix(
    proposal: ProposalContext,
    protocol: ProtocolContext,
    previousResult: GeneratedCode,
    errorFeedback: string
  ): Promise<GeneratedCode> {
    const fixPrompt = `The previous diff failed with: ${errorFeedback}\n\nPrevious diff:\n${previousResult.diff}\n\nPlease fix the issues and regenerate a corrected diff.`;
    const systemPrompt = this.promptBuilder.buildCodegenSystemPrompt(protocol);
    return this.callClaude(systemPrompt, fixPrompt);
  }

  private async callClaude(systemPrompt: string, userPrompt: string): Promise<GeneratedCode> {
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

    return this.parseResponse(text);
  }

  private parseResponse(text: string): GeneratedCode {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/m, "").replace(/\s*```$/m, "").trim();
    let parsed: GeneratedCode;
    try {
      parsed = JSON.parse(cleaned) as GeneratedCode;
    } catch {
      // Try to extract JSON from the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found in AI response");
      parsed = JSON.parse(match[0]) as GeneratedCode;
    }
    // Validate required fields
    if (typeof parsed.diff !== "string") throw new Error("Missing diff in AI response");
    if (typeof parsed.confidence !== "number") throw new Error("Missing confidence in AI response");
    if (typeof parsed.reasoning !== "string") throw new Error("Missing reasoning in AI response");
    if (!Array.isArray(parsed.changedFunctions)) parsed.changedFunctions = [];
    if (!Array.isArray(parsed.newVariables)) parsed.newVariables = [];
    if (!Array.isArray(parsed.warnings)) parsed.warnings = [];
    return parsed;
  }

  validateDiff(diff: string): void {
    if (!diff || diff.trim().length === 0) {
      throw new Error("Empty diff produced by AI");
    }
    if (!diff.includes("---") && !diff.includes("+++") && !diff.includes("@@")) {
      throw new Error("Diff does not appear to be in unified format");
    }
  }
}
