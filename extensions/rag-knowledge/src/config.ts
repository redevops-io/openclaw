/**
 * Shared configuration for RAG Knowledge tools.
 *
 * Resolution order (per field):
 *   1. Plugin config (openclaw.json → plugins.entries.rag-knowledge.config)
 *   2. Environment variable
 *   3. Hardcoded default
 */

import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

export type RagConfig = {
  backendUrl: string;
  workspaceId: string;
  internalToken: string;
};

const DEFAULT_BACKEND_URL = "http://backend-writer.rag-saas.svc.cluster.local:8000";

export function resolveConfig(api: OpenClawPluginApi): RagConfig {
  const pc = (api.pluginConfig ?? {}) as Record<string, unknown>;

  return {
    backendUrl: (pc.backendUrl as string) || process.env.RAG_BACKEND_URL || DEFAULT_BACKEND_URL,

    workspaceId: (pc.workspaceId as string) || process.env.WORKSPACE_ID || "",

    internalToken: (pc.internalToken as string) || process.env.OPENCLAW_GATEWAY_TOKEN || "",
  };
}

/**
 * Helper: make an authenticated POST to the backend writer API.
 */
export async function backendPost(
  cfg: RagConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const url = `${cfg.backendUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": cfg.internalToken,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${path} returned ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}

/**
 * Helper: make an authenticated GET to the backend writer API.
 */
export async function backendGet(cfg: RagConfig, path: string): Promise<unknown> {
  const url = `${cfg.backendUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      "x-internal-token": cfg.internalToken,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${path} returned ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}
