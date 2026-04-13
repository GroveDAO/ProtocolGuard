import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import proposalRoutes from "./routes/proposals";
import logger from "../utils/logger";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/proposals", proposalRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  logger.info(`ProtocolGuard AI Engine running on port ${PORT}`);
});

export default app;
