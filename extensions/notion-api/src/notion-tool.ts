import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

async function getNotionApiKey(): Promise<string> {
  try {
    const keyPath = join(homedir(), ".config", "notion", "api_key");
    const key = await readFile(keyPath, "utf-8");
    return key.trim();
  } catch {
    throw new Error(
      "Notion API key not found. Create ~/.config/notion/api_key with your Notion integration token.",
    );
  }
}

async function callNotionApi(
  endpoint: string,
  method: string,
  apiKey: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": "2025-09-03",
    "Content-Type": "application/json",
  };

  const url = `https://api.notion.com/v1${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function createNotionTool(api: OpenClawPluginApi) {
  return {
    name: "notion",
    label: "Notion",
    description:
      "Interact with Notion API to manage pages, databases (data sources), and blocks. Requires Notion integration key in ~/.config/notion/api_key",
    parameters: Type.Object({
      action: Type.Union(
        [
          Type.Literal("search"),
          Type.Literal("getPage"),
          Type.Literal("getBlocks"),
          Type.Literal("createPage"),
          Type.Literal("updatePage"),
          Type.Literal("queryDatabase"),
          Type.Literal("createDatabase"),
          Type.Literal("addBlocks"),
        ],
        { description: "The Notion API action to perform" },
      ),
      query: Type.Optional(Type.String({ description: "Search query" })),
      pageId: Type.Optional(Type.String({ description: "Page ID" })),
      databaseId: Type.Optional(Type.String({ description: "Database ID" })),
      dataSourceId: Type.Optional(Type.String({ description: "Data source ID (v2025-09-03)" })),
      blockId: Type.Optional(Type.String({ description: "Block ID" })),
      properties: Type.Optional(
        Type.Object({}, { description: "Page properties", additionalProperties: true }),
      ),
      children: Type.Optional(
        Type.Array(
          Type.Object({}, { additionalProperties: true }),
          { description: "Block children" },
        ),
      ),
      filter: Type.Optional(Type.Object({}, { description: "Query filter", additionalProperties: true })),
      sorts: Type.Optional(
        Type.Array(
          Type.Object({}, { additionalProperties: true }),
          { description: "Sort options" },
        ),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const pluginCfg = api.pluginConfig as Record<string, unknown> | undefined;
      const apiKey = (pluginCfg?.apiKey as string) || (await getNotionApiKey());

      const action = params.action as string;

      let endpoint = "";
      let method = "GET";
      let body: unknown = undefined;

      switch (action) {
        case "search":
          endpoint = "/search";
          method = "POST";
          body = params.query ? { query: params.query } : {};
          break;
        case "getPage":
          if (!params.pageId) throw new Error("pageId required for getPage");
          endpoint = `/pages/${params.pageId}`;
          break;
        case "getBlocks":
          if (!params.blockId && !params.pageId)
            throw new Error("blockId or pageId required for getBlocks");
          const id = (params.blockId || params.pageId) as string;
          endpoint = `/blocks/${id}/children`;
          break;
        case "createPage":
          if (!params.properties) throw new Error("properties required for createPage");
          endpoint = "/pages";
          method = "POST";
          body = {
            parent: params.databaseId
              ? { database_id: params.databaseId }
              : { page_id: params.pageId },
            properties: params.properties,
            children: params.children,
          };
          break;
        case "updatePage":
          if (!params.pageId) throw new Error("pageId required for updatePage");
          if (!params.properties) throw new Error("properties required for updatePage");
          endpoint = `/pages/${params.pageId}`;
          method = "PATCH";
          body = { properties: params.properties };
          break;
        case "queryDatabase":
          if (!params.dataSourceId && !params.databaseId)
            throw new Error("dataSourceId or databaseId required for queryDatabase");
          const dbId = (params.dataSourceId || params.databaseId) as string;
          endpoint = `/data_sources/${dbId}/query`;
          method = "POST";
          body = {
            filter: params.filter,
            sorts: params.sorts,
          };
          break;
        case "createDatabase":
          if (!params.pageId) throw new Error("pageId required for createDatabase");
          if (!params.properties) throw new Error("properties required for createDatabase");
          endpoint = "/data_sources";
          method = "POST";
          body = {
            parent: { page_id: params.pageId },
            title: params.title || [{ text: { content: "New Database" } }],
            properties: params.properties,
          };
          break;
        case "addBlocks":
          if (!params.blockId && !params.pageId)
            throw new Error("blockId or pageId required for addBlocks");
          if (!params.children) throw new Error("children required for addBlocks");
          const targetId = (params.blockId || params.pageId) as string;
          endpoint = `/blocks/${targetId}/children`;
          method = "PATCH";
          body = { children: params.children };
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const result = await callNotionApi(endpoint, method, apiKey, body);

      return {
        success: true,
        action,
        result,
      };
    },
  };
}
