#!/usr/bin/env node

/**
 * KayFlux MCP Server
 *
 * Connects Claude to a running KayFlux instance via its REST API.
 * 54 tools for full CRUD + ad-hoc queries across all KayFlux entities.
 *
 * Config:
 *   KAYFLUX_API_URL  — KayFlux API base URL (default: http://localhost:3000)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./lib/tools.js";
import { BASE_URL } from "./lib/client.js";

const server = new McpServer({
  name: "kayflux",
  version: "1.0.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`KayFlux MCP Server running — target API: ${BASE_URL}`);
