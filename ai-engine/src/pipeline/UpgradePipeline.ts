import { ethers } from "ethers";
import { SolidityGenerator } from "../codegen/SolidityGenerator";
import { InvariantChecker, InvariantCheckResult } from "../codegen/InvariantChecker";
import { ForkSimulator } from "../simulation/ForkSimulator";
import { SimulationReport } from "../simulation/SimulationReport";
import { PipelineStateMachine, PipelineStateData } from "./PipelineState";
import { AuditLogger } from "../audit/AuditLogger";
import { ReportGenerator } from "../audit/ReportGenerator";
import logger from "../utils/logger";

export interface PipelineInput {
  proposalId: number;
  title: string;
  description: string;
  constraints: string[];
  protocolAddress: string;
  protocolName: string;
  currentSourceCode: string;
  currentStateValues: Record<string, string>;
  invariants: Array<{ id: number; text: string; testFunctionSig: string }>;
  networkId: number;
  compilerVersion: string;
}

export interface PipelineResult {
  success: boolean;
  diff: string;
  diffHash: string;
  reportHash: string;
  simulationReport: SimulationReport;
  invariantResults: InvariantCheckResult[];
  reasoning: string;
  warnings: string[];
  report: string;
}

export class UpgradePipeline {
  private generator: SolidityGenerator;
  private checker: InvariantChecker;
  private simulator: ForkSimulator;
  private auditLogger: AuditLogger;
  private reportGenerator: ReportGenerator;
  private machines: Map<number, PipelineStateMachine> = new Map();

  constructor() {
    this.generator = new SolidityGenerator();
    this.checker = new InvariantChecker();
    this.simulator = new ForkSimulator();
    this.auditLogger = new AuditLogger();
    this.reportGenerator = new ReportGenerator();
  }

  async run(input: PipelineInput): Promise<PipelineResult> {
    const machine = new PipelineStateMachine(input.proposalId);
    this.machines.set(input.proposalId, machine);

    try {
      // Step 1: Fetch context (already provided via input)
      machine.transition("FETCHING_CONTEXT");
      await this.auditLogger.logAiGenerationStarted(input.proposalId, input.title);

      // Step 2: Generate code
      machine.transition("GENERATING_CODE");
      const generated = await this.generator.generate(
        {
          id: input.proposalId,
          title: input.title,
          description: input.description,
          constraints: input.constraints,
          protocol: input.protocolAddress,
        },
        {
          protocolName: input.protocolName,
          currentSourceCode: input.currentSourceCode,
          currentStateValues: input.currentStateValues,
          invariants: input.invariants.map(i => i.text),
          networkId: input.networkId,
          compilerVersion: input.compilerVersion,
        }
      );
      logger.info(`[UpgradePipeline] Code generated — confidence: ${generated.confidence}`);
      await this.auditLogger.logAiCodeGenerated(
        input.proposalId,
        generated.diff,
        generated.reasoning,
        generated.confidence
      );

      // Step 3: Check invariants
      machine.transition("CHECKING_INVARIANTS");
      const invariantResults = await this.checker.checkAll(
        input.invariants.map(i => ({ id: i.id, text: i.text })),
        input.currentSourceCode,
        generated.diff
      );

      const severity = this.checker.getSeveritySummary(invariantResults);
      const allClear = this.checker.isAllClear(invariantResults);

      if (!allClear) {
        await this.auditLogger.logInvariantCheckFailed(input.proposalId, invariantResults);
      } else {
        await this.auditLogger.logInvariantCheckPassed(input.proposalId, invariantResults);
      }

      if (severity.critical > 0 || severity.failed > 0) {
        machine.transition("FAILED", "One or more invariants failed");
        const report = this.reportGenerator.generate({
          input,
          generated,
          invariantResults,
          simulationReport: this.emptySimReport(),
          success: false,
        });
        return this.buildResult(false, generated, invariantResults, this.emptySimReport(), report);
      }

      // Step 4: Simulate
      machine.transition("SIMULATING");
      await this.auditLogger.logSimulationStarted(input.proposalId);

      const simulationReport = await this.simulator.simulate({
        proposalId: input.proposalId,
        protocolAddress: input.protocolAddress,
        currentSourceCode: input.currentSourceCode,
        diff: generated.diff,
        invariantSignatures: input.invariants
          .filter(i => i.testFunctionSig)
          .map(i => i.testFunctionSig),
        networkId: input.networkId,
      });

      if (simulationReport.success) {
        await this.auditLogger.logSimulationPassed(input.proposalId, simulationReport);
      } else {
        await this.auditLogger.logSimulationFailed(input.proposalId, simulationReport);
      }

      // Step 5: Submit report
      machine.transition("SUBMITTING_REPORT");
      const report = this.reportGenerator.generate({
        input,
        generated,
        invariantResults,
        simulationReport,
        success: simulationReport.success,
      });

      const success = simulationReport.success;
      machine.transition(success ? "DONE" : "FAILED");

      await this.auditLogger.logExecutionSubmitted(input.proposalId, success);

      return this.buildResult(success, generated, invariantResults, simulationReport, report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      machine.transition("FAILED", msg);
      logger.error(`[UpgradePipeline] Pipeline failed for proposal ${input.proposalId}: ${msg}`);
      throw err;
    }
  }

  getState(proposalId: number): PipelineStateData | null {
    return this.machines.get(proposalId)?.getState() ?? null;
  }

  private buildResult(
    success: boolean,
    generated: { diff: string; reasoning: string; warnings: string[] },
    invariantResults: InvariantCheckResult[],
    simulationReport: SimulationReport,
    report: string
  ): PipelineResult {
    const diffHash = ethers.keccak256(ethers.toUtf8Bytes(generated.diff));
    const reportHash = ethers.keccak256(ethers.toUtf8Bytes(report));
    return {
      success,
      diff: generated.diff,
      diffHash,
      reportHash,
      simulationReport,
      invariantResults,
      reasoning: generated.reasoning,
      warnings: generated.warnings,
      report,
    };
  }

  private emptySimReport(): SimulationReport {
    return {
      success: false,
      blockNumber: 0,
      gasUsedDeploy: BigInt(0),
      sanityChecks: [],
      invariantTests: [],
      stateDiffs: [],
      compilationWarnings: [],
      failureReason: "Simulation not run due to invariant failure",
      durationMs: 0,
    };
  }
}
