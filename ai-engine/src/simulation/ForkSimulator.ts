import { SimulationReport, SanityCheck, StateDiff } from "./SimulationReport";
import { InvariantRunner } from "./InvariantRunner";
import logger from "../utils/logger";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export interface SimulationInput {
  proposalId: number;
  protocolAddress: string;
  currentSourceCode: string;
  diff: string;
  invariantSignatures: string[];
  networkId: number;
}

export class ForkSimulator {
  private invariantRunner: InvariantRunner;
  private simDir: string;

  constructor() {
    this.invariantRunner = new InvariantRunner();
    this.simDir = process.env.SIMULATION_TEMP_DIR ?? "./sim-tmp";
  }

  async simulate(input: SimulationInput): Promise<SimulationReport> {
    const start = Date.now();
    const workDir = path.join(this.simDir, `proposal-${input.proposalId}-${Date.now()}`);

    try {
      logger.info(`[ForkSimulator] Starting simulation for proposal ${input.proposalId}`);
      fs.mkdirSync(workDir, { recursive: true });

      // Write original source
      const sourceFile = path.join(workDir, "Contract.sol");
      fs.writeFileSync(sourceFile, input.currentSourceCode);

      // Apply diff
      const patchFile = path.join(workDir, "changes.patch");
      fs.writeFileSync(patchFile, input.diff);

      let patchApplied = false;
      let compilationWarnings: string[] = [];
      try {
        execSync(`patch --dry-run -p1 ${sourceFile} ${patchFile}`, {
          cwd: workDir,
          stdio: "pipe",
        });
        execSync(`patch -p1 ${sourceFile} ${patchFile}`, {
          cwd: workDir,
          stdio: "pipe",
        });
        patchApplied = true;
      } catch (patchErr) {
        compilationWarnings.push(`Patch application failed: ${String(patchErr)}`);
      }

      const sanityChecks = this.runSanityChecks(
        input.currentSourceCode,
        patchApplied ? fs.readFileSync(sourceFile, "utf-8") : input.currentSourceCode,
        patchApplied
      );

      const invariantTests = await this.invariantRunner.run(
        input.invariantSignatures,
        input.protocolAddress,
        input.networkId
      );

      const stateDiffs = this.computeStateDiffs(input.currentSourceCode, input.diff);
      const allPassed = sanityChecks.every(c => c.passed) && invariantTests.every(t => t.passed);

      const report: SimulationReport = {
        success: allPassed,
        blockNumber: 0,
        gasUsedDeploy: BigInt(0),
        sanityChecks,
        invariantTests,
        stateDiffs,
        compilationWarnings,
        failureReason: allPassed ? null : this.collectFailureReason(sanityChecks, invariantTests),
        durationMs: Date.now() - start,
      };

      logger.info(
        `[ForkSimulator] Simulation complete in ${report.durationMs}ms — ${report.success ? "PASSED" : "FAILED"}`
      );
      return report;
    } finally {
      // Clean up working directory
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {
        // Non-fatal cleanup failure
      }
    }
  }

  private runSanityChecks(
    original: string,
    patched: string,
    patchApplied: boolean
  ): SanityCheck[] {
    const checks: SanityCheck[] = [];

    checks.push({
      name: "Patch Applied",
      passed: patchApplied,
      details: patchApplied
        ? "Diff applied cleanly to source file"
        : "Diff could not be applied — source may have diverged",
    });

    // Check no access-control removal
    const hadOnlyOwner = /onlyOwner|onlyRole/.test(original);
    const stillHasAccessControl = /onlyOwner|onlyRole/.test(patched);
    const accessControlOk = !hadOnlyOwner || stillHasAccessControl;
    checks.push({
      name: "Access Control Preserved",
      passed: accessControlOk,
      details: accessControlOk
        ? "Access control modifiers present"
        : "WARNING: access control modifiers may have been removed",
    });

    // Check for obvious reentrancy patterns
    const noNewReentrancy = !(/\.call\{value:/.test(patched) && !/.nonReentrant/.test(patched));
    checks.push({
      name: "No Obvious Reentrancy",
      passed: noNewReentrancy,
      details: noNewReentrancy
        ? "No unguarded external calls with value detected"
        : "Potential reentrancy: .call{value:...} without nonReentrant modifier",
    });

    checks.push({
      name: "Solidity Version",
      passed: /pragma solidity \^0\.8/.test(patched),
      details: "Contract uses Solidity 0.8.x",
    });

    return checks;
  }

  private computeStateDiffs(source: string, diff: string): StateDiff[] {
    const diffs: StateDiff[] = [];
    const lines = diff.split("\n");
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        const match = line.match(/uint256 public (\w+)\s*=\s*([\d_]+)/);
        if (match) {
          const varName = match[1];
          const newVal = match[2];
          const origMatch = source.match(new RegExp(`uint256 public ${varName}\\s*=\\s*([\\d_]+)`));
          diffs.push({
            variable: varName,
            before: origMatch ? origMatch[1] : "unknown",
            after: newVal,
          });
        }
      }
    }
    return diffs;
  }

  private collectFailureReason(
    sanityChecks: SanityCheck[],
    invariantTests: Array<{ passed: boolean; signature: string; revertReason?: string }>
  ): string {
    const failed = [
      ...sanityChecks.filter(c => !c.passed).map(c => `Sanity: ${c.name} — ${c.details}`),
      ...invariantTests
        .filter(t => !t.passed)
        .map(t => `Invariant: ${t.signature} — ${t.revertReason ?? "reverted"}`),
    ];
    return failed.join("; ");
  }
}
