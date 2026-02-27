/**
 * document-list tool
 *
 * Lists all documents in the workspace with their processing status.
 * Calls POST /internal/duckdb/documents on the backend writer.
 */

import { Type } from "@sinclair/typebox";
import { type RagConfig, backendPost } from "./config.js";

type DocumentInfo = {
  name: string;
  status: string;
  chunk_count: number;
  file_type: string;
  created_at: string;
  size_bytes?: number;
};

type DocumentsResponse = {
  documents: DocumentInfo[];
  total: number;
};

export function createDocumentListTool(cfg: RagConfig) {
  return {
    name: "document-list",
    label: "List Documents",
    description:
      "List all documents in the workspace knowledge base with their " +
      "processing status, chunk counts, and file types. Use this when " +
      'the user asks "what documents do I have?" or wants to see their ' +
      "uploaded files.",
    parameters: Type.Object({
      status_filter: Type.Optional(
        Type.String({
          description:
            'Filter by status: "completed", "processing", "failed", "all" (default: "all")',
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      if (!cfg.workspaceId) {
        throw new Error("WORKSPACE_ID not configured.");
      }

      const statusFilter = (params.status_filter as string) || "all";

      const data = (await backendPost(cfg, "/internal/duckdb/documents", {
        workspace_id: cfg.workspaceId,
        status_filter: statusFilter,
      })) as DocumentsResponse;

      if (!data.documents || data.documents.length === 0) {
        return {
          success: true,
          total: 0,
          documents: [],
          message: "No documents found in the workspace.",
        };
      }

      const formatted = data.documents.map((d, i) => ({
        index: i + 1,
        name: d.name,
        status: d.status,
        chunks: d.chunk_count,
        type: d.file_type,
        uploaded: d.created_at,
      }));

      return {
        success: true,
        total: data.total,
        documents: formatted,
      };
    },
  };
}
