/**
 * OpenClaw RAG Knowledge Base Plugin
 *
 * Replaces the SKILL.md "prompt-engineering" approach with proper registered
 * tools that the agent can invoke directly.  Tools:
 *
 *   1. knowledge-search   — Vector-similarity search over workspace DuckDB
 *   2. knowledge-status    — Document/chunk counts + health info
 *   3. web-search-ingest   — Search the web and ingest results into KB
 *   4. url-ingest          — Fetch a URL and ingest its content
 *   5. document-list       — List all documents in the workspace
 *   6. channel-read        — Read recent messages from a Telegram channel
 */

import type { OpenClawPluginApi, AnyAgentTool } from "../../src/plugins/types.js";
import { createChannelReadTool } from "./src/channel-read.js";
import { resolveConfig, type RagConfig } from "./src/config.js";
import { createDocumentListTool } from "./src/document-list.js";
import { createKnowledgeSearchTool } from "./src/knowledge-search.js";
import { createKnowledgeStatusTool } from "./src/knowledge-status.js";
import { createUrlIngestTool } from "./src/url-ingest.js";
import { createWebSearchIngestTool } from "./src/web-search-ingest.js";

export default function register(api: OpenClawPluginApi) {
  const cfg = resolveConfig(api);

  const tools = [
    createKnowledgeSearchTool(cfg),
    createKnowledgeStatusTool(cfg),
    createWebSearchIngestTool(cfg),
    createUrlIngestTool(cfg),
    createDocumentListTool(cfg),
    createChannelReadTool(cfg),
  ];

  for (const tool of tools) {
    api.registerTool(tool as unknown as AnyAgentTool, { optional: true });
  }

  api.logger.info(
    `RAG Knowledge plugin registered ${tools.length} tools ` +
      `(workspace ${cfg.workspaceId || "unset"})`,
  );
}
