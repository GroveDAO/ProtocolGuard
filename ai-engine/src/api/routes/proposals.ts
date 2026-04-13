import { Router, Request, Response, NextFunction } from "express";
import { UpgradePipeline, PipelineInput } from "../../pipeline/UpgradePipeline";
import logger from "../../utils/logger";

const router = Router();
const pipeline = new UpgradePipeline();

// In-memory store for reports (production would use a database)
const reports = new Map<number, string>();

/**
 * POST /api/proposals/:id/process
 * Triggers the AI pipeline for a proposal. Body must contain PipelineInput fields.
 */
router.post("/:id/process", async (req: Request, res: Response, next: NextFunction) => {
  const proposalId = parseInt(req.params.id, 10);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid proposal ID" });
    return;
  }

  const input: PipelineInput = {
    proposalId,
    title: req.body.title ?? "",
    description: req.body.description ?? "",
    constraints: req.body.constraints ?? [],
    protocolAddress: req.body.protocolAddress ?? "",
    protocolName: req.body.protocolName ?? "",
    currentSourceCode: req.body.currentSourceCode ?? "",
    currentStateValues: req.body.currentStateValues ?? {},
    invariants: req.body.invariants ?? [],
    networkId: req.body.networkId ?? 177,
    compilerVersion: req.body.compilerVersion ?? "0.8.20",
  };

  if (!input.title || !input.protocolAddress || !input.currentSourceCode) {
    res.status(400).json({ error: "Missing required fields: title, protocolAddress, currentSourceCode" });
    return;
  }

  // Run pipeline asynchronously
  res.status(202).json({ proposalId, status: "PROCESSING" });

  pipeline.run(input).then(result => {
    reports.set(proposalId, result.report);
    logger.info(`[API] Pipeline complete for proposal ${proposalId}: ${result.success ? "PASS" : "FAIL"}`);
  }).catch(err => {
    logger.error(`[API] Pipeline failed for proposal ${proposalId}: ${err}`);
  });
});

/**
 * GET /api/proposals/:id/status
 * Returns the current pipeline state for a proposal.
 */
router.get("/:id/status", (req: Request, res: Response) => {
  const proposalId = parseInt(req.params.id, 10);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid proposal ID" });
    return;
  }

  const state = pipeline.getState(proposalId);
  if (!state) {
    res.status(404).json({ error: "No pipeline found for this proposal" });
    return;
  }

  res.json(state);
});

/**
 * GET /api/proposals/:id/report
 * Returns the generated Markdown/HTML report for a completed proposal.
 */
router.get("/:id/report", (req: Request, res: Response) => {
  const proposalId = parseInt(req.params.id, 10);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid proposal ID" });
    return;
  }

  const report = reports.get(proposalId);
  if (!report) {
    res.status(404).json({ error: "Report not yet available" });
    return;
  }

  const accept = req.headers.accept ?? "";
  if (accept.includes("text/html")) {
    res.setHeader("Content-Type", "text/html");
    res.send(`<html><body><pre>${report}</pre></body></html>`);
  } else {
    res.setHeader("Content-Type", "text/markdown");
    res.send(report);
  }
});

export default router;
