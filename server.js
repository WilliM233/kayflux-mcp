#!/usr/bin/env node

/**
 * WWE Universe Mode — SQLite MCP Server
 * Provides direct read/write access to wwe_universe.db
 * for Claude (claude.ai projects), CCO HQ, and Claude Code.
 *
 * Tools exposed:
 *   read_query   — Execute a SELECT statement, returns rows as JSON
 *   write_query  — Execute INSERT / UPDATE / DELETE, returns affected rows
 *   get_schema   — Return full schema (tables, columns, types)
 *   list_tables  — Quick list of all table names
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";
import path from "path";
import fs from "fs";

// ── Database path ──────────────────────────────────────────────────────────
// Passed as first CLI argument, or falls back to WWE_DB_PATH env var.
// Example: node server.js "D:\_DEVELOPMENT\wwe_universe.db"
const dbPath = process.argv[2] || process.env.WWE_DB_PATH;

if (!dbPath) {
  console.error(
    "ERROR: No database path provided.\n" +
    "Usage: node server.js <path-to-wwe_universe.db>\n" +
    "   or: set WWE_DB_PATH=<path> then node server.js"
  );
  process.exit(1);
}

const resolvedPath = path.resolve(dbPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`ERROR: Database file not found at: ${resolvedPath}`);
  process.exit(1);
}

// Open DB — WAL mode for safe concurrent reads while writes happen
const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── MCP Server setup ───────────────────────────────────────────────────────
const server = new McpServer({
  name: "wwe-universe-sqlite",
  version: "1.0.0",
});

// ── Tool: list_tables ──────────────────────────────────────────────────────
server.tool(
  "list_tables",
  "List all tables in the WWE Universe database",
  {},
  async () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tables, null, 2),
        },
      ],
    };
  }
);

// ── Tool: get_schema ───────────────────────────────────────────────────────
server.tool(
  "get_schema",
  "Get the full schema of the WWE Universe database — all tables, columns, and types",
  {
    table: z
      .string()
      .optional()
      .describe("Optional: get schema for a single table only"),
  },
  async ({ table }) => {
    let tables;

    if (table) {
      tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .all(table)
        .map((r) => r.name);
    } else {
      tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all()
        .map((r) => r.name);
    }

    const schema = {};
    for (const tbl of tables) {
      const cols = db.prepare(`PRAGMA table_info(${tbl})`).all();
      const fks = db.prepare(`PRAGMA foreign_key_list(${tbl})`).all();
      schema[tbl] = {
        columns: cols.map((c) => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull === 1,
          default: c.dflt_value,
          pk: c.pk === 1,
        })),
        foreign_keys: fks.map((fk) => ({
          from: fk.from,
          references: `${fk.table}.${fk.to}`,
        })),
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }
);

// ── Tool: read_query ───────────────────────────────────────────────────────
server.tool(
  "read_query",
  "Execute a SELECT query against the WWE Universe database and return results as JSON",
  {
    sql: z
      .string()
      .describe("A valid SQLite SELECT statement"),
    params: z
      .array(z.union([z.string(), z.number(), z.null()]))
      .optional()
      .describe("Optional bound parameters (use ? placeholders in SQL)"),
  },
  async ({ sql, params = [] }) => {
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("WITH")) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "ERROR: read_query only accepts SELECT or WITH (CTE) statements. Use write_query for INSERT/UPDATE/DELETE.",
          },
        ],
      };
    }

    try {
      const rows = db.prepare(sql).all(...params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { count: rows.length, rows },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `SQL ERROR: ${err.message}` }],
      };
    }
  }
);

// ── Tool: write_query ──────────────────────────────────────────────────────
server.tool(
  "write_query",
  "Execute an INSERT, UPDATE, or DELETE statement against the WWE Universe database",
  {
    sql: z
      .string()
      .describe("A valid SQLite INSERT, UPDATE, or DELETE statement"),
    params: z
      .array(z.union([z.string(), z.number(), z.null()]))
      .optional()
      .describe("Optional bound parameters (use ? placeholders in SQL)"),
  },
  async ({ sql, params = [] }) => {
    const trimmed = sql.trim().toUpperCase();
    const allowed = ["INSERT", "UPDATE", "DELETE", "REPLACE"];
    const isAllowed = allowed.some((kw) => trimmed.startsWith(kw));

    if (!isAllowed) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "ERROR: write_query only accepts INSERT, UPDATE, DELETE, or REPLACE. Use read_query for SELECT.",
          },
        ],
      };
    }

    try {
      const result = db.prepare(sql).run(...params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                changes: result.changes,
                lastInsertRowid: result.lastInsertRowid ?? null,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `SQL ERROR: ${err.message}` }],
      };
    }
  }
);

// ── Start ──────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`WWE Universe MCP Server running — connected to: ${resolvedPath}`);
