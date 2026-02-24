#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./lib/config.js";
import { VibeUnivClient } from "./lib/api-client.js";
import { registerSyncProject } from "./tools/sync-project.js";
import { registerUploadFiles } from "./tools/upload-files.js";
import { registerAnalyze } from "./tools/analyze.js";
import { registerGetLearning } from "./tools/get-learning.js";
import { registerLogSession } from "./tools/log-session.js";
import { registerAskTutor } from "./tools/ask-tutor.js";
import { registerSubmitAnalysis } from "./tools/submit-analysis.js";

async function main(): Promise<void> {
  console.error("[vibeuniv] Starting VibeUniv MCP Server v0.1.1...");

  const config = loadConfig();
  const client = new VibeUnivClient(config.apiKey, config.apiUrl);

  const server = new McpServer({
    name: "vibeuniv-mcp-server",
    version: "0.1.0",
  });

  registerSyncProject(server, client);
  registerUploadFiles(server, client);
  registerAnalyze(server, client);
  registerGetLearning(server, client);
  registerLogSession(server, client);
  registerAskTutor(server, client);
  registerSubmitAnalysis(server, client);

  console.error("[vibeuniv] 7 tools registered");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[vibeuniv] MCP Server running on stdio");
}

main().catch((error) => {
  console.error("[vibeuniv] Fatal error:", error);
  process.exit(1);
});
