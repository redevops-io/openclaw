/**
 * knowledge-status tool
 *
 * Returns document/chunk counts and overall health of the workspace
 * knowledge base.  Calls POST /internal/duckdb/status on the backend.
 */

import { Type } from "@sinclair/typebox";
import { type RagConfig, backendPost } from "./config.js";

type StatusResponse = {
  workspace_id: string;
  document_count: number;
  chunk_count: number;
  conversation_count: number;
  external_knowledge_count: number;
  healthy: boolean;
};

export function createKnowledgeStatusTool(cfg: RagConfig) {
  return {
    name: "knowledge-status",
    label: "Knowledge Base Status",
    description:
      "Get the current status of the workspace knowledge base — how many " +
      "documents, chunks, and conversations are indexed. Use this when " +
      'the user asks about their data, storage, or says "status".',
    parameters: Type.Object({}),

    async execute(_id: string, _params: Record<string, unknown>) {
      if (!cfg.workspaceId) {
        throw new Error("WORKSPACE_ID not configured.");
      }

      const data = (await backendPost(cfg, "/internal/duckdb/status", {
        workspace_id: cfg.workspaceId,
      })) as StatusResponse;

      return {
        success: true,
        workspace_id: cfg.workspaceId,
        documents: data.document_count,
        chunks: data.chunk_count,
        conversations: data.conversation_count,
        external_sources: data.external_knowledge_count,
        healthy: data.healthy,
      };
    },
  };
}
