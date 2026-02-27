/**
 * web-search-ingest tool
 *
 * Ingests arbitrary text content into the workspace knowledge base.
 * The agent can use this after a brave-search, web_fetch, or any
 * other source to permanently store findings for future retrieval
 * via knowledge-search.
 */

import { Type } from "@sinclair/typebox";
import { type RagConfig, backendPost } from "./config.js";

export function createWebSearchIngestTool(cfg: RagConfig) {
  return {
    name: "ingest-text",
    label: "Ingest Text into Knowledge Base",
    description:
      "Save text content into the workspace knowledge base so it can " +
      "be found later with knowledge-search. Use this after performing " +
      "a web search (brave-search), fetching a URL (web_fetch), or " +
      "receiving any valuable information worth preserving. Provide " +
      "the actual text content and a descriptive source name.",
    parameters: Type.Object({
      content: Type.String({
        description:
          "The text content to ingest. This will be chunked, embedded, " +
          "and stored in the vector database.",
      }),
      source_name: Type.String({
        description:
          'A descriptive name for this content (e.g. "Web search: AI trends 2025", ' +
          '"Article: How to build RAG systems")',
      }),
      source_type: Type.Optional(
        Type.String({
          description: 'Content type: "web_search", "url", "note", "analysis" (default: "note")',
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const content = params.content as string;
      if (!content?.trim()) {
        throw new Error("content is required and cannot be empty");
      }
      if (!cfg.workspaceId) {
        throw new Error("WORKSPACE_ID not configured.");
      }

      const sourceName = (params.source_name as string) || "Ingested content";
      const sourceType = (params.source_type as string) || "note";

      const data = await backendPost(cfg, "/internal/duckdb/ingest-text", {
        workspace_id: cfg.workspaceId,
        content,
        source_name: sourceName,
        source_type: sourceType,
      });

      return {
        success: true,
        source_name: sourceName,
        content_length: content.length,
        message: `Successfully ingested ${content.length} characters as "${sourceName}".`,
        data,
      };
    },
  };
}
