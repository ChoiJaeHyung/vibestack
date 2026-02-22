#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./lib/config.js";
import { VibeStackClient } from "./lib/api-client.js";
import { registerSyncProject } from "./tools/sync-project.js";
import { registerUploadFiles } from "./tools/upload-files.js";
import { registerAnalyze } from "./tools/analyze.js";
import { registerGetLearning } from "./tools/get-learning.js";
import { registerLogSession } from "./tools/log-session.js";
import { registerAskTutor } from "./tools/ask-tutor.js";

async function main(): Promise<void> {
  console.error("[vibestack] Starting VibeStack MCP Server v0.1.0...");

  const config = loadConfig();
  const client = new VibeStackClient(config.apiKey, config.apiUrl);

  const server = new McpServer({
    name: "vibestack-mcp-server",
    version: "0.1.0",
  });

  registerSyncProject(server, client);
  registerUploadFiles(server, client);
  registerAnalyze(server, client);
  registerGetLearning(server, client);
  registerLogSession(server, client);
  registerAskTutor(server, client);

  console.error("[vibestack] 6 tools registered");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[vibestack] MCP Server running on stdio");
}

main().catch((error) => {
  console.error("[vibestack] Fatal error:", error);
  process.exit(1);
});
