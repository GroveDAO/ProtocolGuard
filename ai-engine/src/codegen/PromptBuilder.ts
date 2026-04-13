export interface ProposalContext {
  id: number;
  title: string;
  description: string;
  constraints: string[];
  protocol: string;
}

export interface ProtocolContext {
  protocolName: string;
  currentSourceCode: string;
  currentStateValues: Record<string, string>;
  invariants: string[];
  networkId: number;
  compilerVersion: string;
}

export class PromptBuilder {
  buildCodegenSystemPrompt(protocol: ProtocolContext): string {
    return `You are an expert Solidity smart contract developer and security auditor working on HashKey Chain.
You are working with the ${protocol.protocolName} DeFi protocol.

CURRENT CONTRACT SOURCE:
\`\`\`solidity
${protocol.currentSourceCode}
\`\`\`

CURRENT STATE VALUES:
${Object.entries(protocol.currentStateValues).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

PROTOCOL INVARIANTS (must NEVER be violated):
${protocol.invariants.map((inv, i) => `${i + 1}. ${inv}`).join('\n')}

INSTRUCTIONS:
1. Make ONLY the minimal changes necessary to fulfill the proposal
2. NEVER remove access controls or ownership checks
3. NEVER introduce reentrancy vulnerabilities
4. NEVER change function signatures that external contracts may depend on
5. ADD natspec comments to every modified function
6. Prefer parameter changes over logic changes when possible
7. If the proposal cannot be safely implemented, explain why in the reasoning field

OUTPUT: You must respond with ONLY valid JSON matching this exact schema:
{
  "diff": "<unified diff in standard format>",
  "changedFunctions": ["array", "of", "function", "names"],
  "newVariables": ["array", "of", "new", "variable", "names"],
  "reasoning": "detailed step-by-step explanation of changes",
  "confidence": <integer 0-100>,
  "warnings": ["array", "of", "potential", "risk", "warnings"]
}`;
  }

  buildCodegenUserPrompt(proposal: ProposalContext): string {
    return `UPGRADE PROPOSAL:
Title: ${proposal.title}
Description: ${proposal.description}
${proposal.constraints.length > 0 ? `Additional Constraints:\n${proposal.constraints.map(c => `- ${c}`).join('\n')}` : ''}

Generate the minimal Solidity code changes to implement this proposal safely.
Remember: your changes will be automatically deployed after simulation — be precise and conservative.`;
  }

  buildInvariantCheckSystemPrompt(currentCode: string, diff: string): string {
    return `You are an expert smart contract security auditor. Your job is to determine
whether a proposed code change violates any of the protocol's safety invariants.
Be extremely conservative — a false positive (saying FAIL when the code is safe) is
preferable to a false negative (saying PASS when the code has a bug).

CURRENT CONTRACT CODE:
\`\`\`solidity
${currentCode}
\`\`\`

PROPOSED DIFF:
\`\`\`diff
${diff}
\`\`\`

Respond with ONLY a JSON array of objects with this exact schema per invariant:
[{
  "invariantId": <number>,
  "verdict": "PASS" | "FAIL" | "UNCERTAIN",
  "reasoning": "<detailed analysis>",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "suggestedMitigation": "<string or null>"
}]`;
  }

  buildInvariantCheckUserPrompt(invariants: Array<{ id: number; text: string }>): string {
    return `Check the proposed diff against each of these invariants:\n\n${
      invariants.map(inv => `[${inv.id}] ${inv.text}`).join('\n')
    }\n\nReturn a JSON array with one entry per invariant.`;
  }
}
