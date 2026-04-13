export interface SanityCheck {
  name: string;
  passed: boolean;
  details: string;
}

export interface InvariantTest {
  signature: string;
  passed: boolean;
  revertReason?: string;
}

export interface StateDiff {
  variable: string;
  before: string;
  after: string;
}

export interface SimulationReport {
  success: boolean;
  blockNumber: number;
  gasUsedDeploy: bigint;
  sanityChecks: SanityCheck[];
  invariantTests: InvariantTest[];
  stateDiffs: StateDiff[];
  compilationWarnings: string[];
  failureReason: string | null;
  durationMs: number;
}
