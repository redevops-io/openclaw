/**
 * knowledge-search tool
 *
 * Vector-similarity search over the workspace DuckDB knowledge base.
 * Calls POST /internal/duckdb/search on the backend writer.
 */

import { Type } from "@sinclair/typebox";
import { type RagConfig, backendPost } from "./config.js";

type SearchResult = {
  content: string;
  score: number;
  document_name: string;
  chunk_index?: number;
  metadata?: Record<string, unknown>;
};

type SearchResponse = {
  results: SearchResult[];
  total: number;
};

export function createKnowledgeSearchTool(cfg: RagConfig) {
  return {
    name: "knowledge-search",
    label: "Knowledge Base Search",
    description:
      "Search the workspace knowledge base (uploaded documents, Telegram " +
      "chat history, web-sourced content) using natural-language queries. " +
      "Always use this tool first when the user asks about information that " +
      "might be in their documents or knowledge base. Cite document names " +
      "when quoting results.",
    parameters: Type.Object({
      query: Type.String({
        description:
          "Natural-language search query. Be specific — rephrase the " +
          "user's question into a focused search phrase.",
      }),
      top_k: Type.Optional(
        Type.Number({
          description: "Number of results to return (default: 10, max: 30)",
          minimum: 1,
          maximum: 30,
        }),
      ),
      threshold: Type.Optional(
        Type.Number({
          description:
            "Minimum similarity score 0–1 (default: 0.3). Lower = more " +
            "results but less relevant.",
          minimum: 0,
          maximum: 1,
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const query = params.query as string;
      if (!query?.trim()) {
        throw new Error("query is required and cannot be empty");
      }

      if (!cfg.workspaceId) {
        throw new Error(
          "WORKSPACE_ID not configured. Set it in the plugin config or " +
            "as an environment variable.",
        );
      }

      const data = (await backendPost(cfg, "/internal/duckdb/search", {
        workspace_id: cfg.workspaceId,
        query,
        top_k: (params.top_k as number) || 10,
        threshold: (params.threshold as number) || 0.3,
      })) as SearchResponse;

      if (!data.results || data.results.length === 0) {
        return {
          success: true,
          query,
          total: 0,
          results: [],
          message:
            "No matching documents found. The user may need to upload " +
            "relevant documents first.",
        };
      }

      // Format results for the agent with clear citations
      const formatted = data.results.map((r, i) => ({
        rank: i + 1,
        document: r.document_name,
        relevance: Math.round(r.score * 100) + "%",
        content: r.content,
        chunk_index: r.chunk_index,
        related: r.metadata?.related === true,
      }));

      return {
        success: true,
        query,
        total: data.total,
        results: formatted,
      };
    },
  };
}
