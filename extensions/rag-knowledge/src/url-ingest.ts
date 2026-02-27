/**
 * url-ingest tool
 *
 * Fetches a URL and ingests its content into the workspace KB.
 * Uses the OpenClaw built-in web_fetch tool for the actual HTTP
 * request, then sends the extracted text to the backend for
 * chunking and embedding.
 */

import { Type } from "@sinclair/typebox";
import { type RagConfig, backendPost } from "./config.js";

export function createUrlIngestTool(cfg: RagConfig) {
  return {
    name: "url-ingest",
    label: "Ingest URL into Knowledge Base",
    description:
      "Fetch a web page or API endpoint and save its content into the " +
      "workspace knowledge base. The content will be chunked, embedded, " +
      "and searchable via knowledge-search. Use this when the user " +
      "provides a URL they want to add to their knowledge base.",
    parameters: Type.Object({
      url: Type.String({
        description: "The URL to fetch and ingest",
      }),
      source_name: Type.Optional(
        Type.String({
          description:
            "Label for this source (default: the URL). " +
            'E.g. "Company blog post about AI strategy"',
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const url = params.url as string;
      if (!url?.trim()) {
        throw new Error("url is required and cannot be empty");
      }
      if (!cfg.workspaceId) {
        throw new Error("WORKSPACE_ID not configured.");
      }

      // Fetch the URL content server-side
      let content: string;
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; OpenClaw-RAG/1.0; +https://github.com/openclaw)",
          },
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        content = await res.text();
      } catch (err) {
        throw new Error(
          `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!content.trim()) {
        return {
          success: false,
          message: `URL returned empty content: ${url}`,
        };
      }

      // Strip HTML tags for cleaner ingestion
      const textContent = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const sourceName = (params.source_name as string) || url;

      const data = await backendPost(cfg, "/internal/duckdb/ingest-text", {
        workspace_id: cfg.workspaceId,
        content: textContent,
        source_name: sourceName,
        source_type: "url",
      });

      return {
        success: true,
        url,
        source_name: sourceName,
        content_length: textContent.length,
        preview: textContent.slice(0, 500) + (textContent.length > 500 ? "…" : ""),
        message: `Successfully ingested ${textContent.length} characters from ${url}.`,
        data,
      };
    },
  };
}
