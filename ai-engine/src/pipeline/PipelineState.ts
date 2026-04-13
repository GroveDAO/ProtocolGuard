export type PipelineStep =
  | "IDLE"
  | "FETCHING_CONTEXT"
  | "GENERATING_CODE"
  | "CHECKING_INVARIANTS"
  | "SIMULATING"
  | "SUBMITTING_REPORT"
  | "DONE"
  | "FAILED";

export interface PipelineStateData {
  step: PipelineStep;
  proposalId: number;
  startedAt: Date;
  updatedAt: Date;
  error?: string;
}

export class PipelineStateMachine {
  private state: PipelineStateData;
  private callbacks: Array<(state: PipelineStateData) => void> = [];

  constructor(proposalId: number) {
    this.state = {
      step: "IDLE",
      proposalId,
      startedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  transition(step: PipelineStep, error?: string): void {
    this.state = { ...this.state, step, updatedAt: new Date(), error };
    this.callbacks.forEach(cb => cb(this.state));
  }

  getState(): PipelineStateData {
    return { ...this.state };
  }

  onStateChange(callback: (state: PipelineStateData) => void): void {
    this.callbacks.push(callback);
  }
}
