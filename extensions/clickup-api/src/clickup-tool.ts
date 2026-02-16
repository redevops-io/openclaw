import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

type MatonConfig = {
  apiKey?: string;
  connectionId?: string;
};

async function callMatonApi(
  endpoint: string,
  method: string,
  apiKey: string,
  connectionId?: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": "2025-09-03",
  };

  if (connectionId) {
    headers["Maton-Connection"] = connectionId;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const url = `https://gateway.maton.ai/clickup${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ClickUp API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function createClickUpTool(api: OpenClawPluginApi) {
  return {
    name: "clickup",
    label: "ClickUp",
    description:
      "Interact with ClickUp API to manage tasks, lists, folders, spaces, and workspaces. Supports OAuth via Maton gateway.",
    parameters: Type.Object({
      action: Type.Union(
        [
          Type.Literal("getTeams"),
          Type.Literal("getSpaces"),
          Type.Literal("getFolders"),
          Type.Literal("getLists"),
          Type.Literal("getTasks"),
          Type.Literal("getTask"),
          Type.Literal("createTask"),
          Type.Literal("updateTask"),
          Type.Literal("deleteTask"),
        ],
        { description: "The ClickUp API action to perform" },
      ),
      teamId: Type.Optional(Type.String({ description: "Team/workspace ID" })),
      spaceId: Type.Optional(Type.String({ description: "Space ID" })),
      folderId: Type.Optional(Type.String({ description: "Folder ID" })),
      listId: Type.Optional(Type.String({ description: "List ID" })),
      taskId: Type.Optional(Type.String({ description: "Task ID" })),
      data: Type.Optional(
        Type.Object(
          {},
          {
            description: "Task data for create/update operations",
            additionalProperties: true,
          },
        ),
      ),
      queryParams: Type.Optional(
        Type.Object(
          {},
          {
            description: "Additional query parameters",
            additionalProperties: true,
          },
        ),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const pluginCfg = (api.pluginConfig ?? {}) as MatonConfig;
      const apiKey = pluginCfg.apiKey || process.env.MATON_API_KEY;

      if (!apiKey) {
        throw new Error(
          "MATON_API_KEY not configured. Set it in plugin config or environment variable.",
        );
      }

      const action = params.action as string;
      const teamId = params.teamId as string | undefined;
      const spaceId = params.spaceId as string | undefined;
      const folderId = params.folderId as string | undefined;
      const listId = params.listId as string | undefined;
      const taskId = params.taskId as string | undefined;
      const data = params.data as Record<string, unknown> | undefined;
      const queryParams = params.queryParams as Record<string, unknown> | undefined;

      let endpoint = "";
      let method = "GET";

      switch (action) {
        case "getTeams":
          endpoint = "/api/v2/team";
          break;
        case "getSpaces":
          if (!teamId) throw new Error("teamId required for getSpaces");
          endpoint = `/api/v2/team/${teamId}/space`;
          break;
        case "getFolders":
          if (!spaceId) throw new Error("spaceId required for getFolders");
          endpoint = `/api/v2/space/${spaceId}/folder`;
          break;
        case "getLists":
          if (!folderId) throw new Error("folderId required for getLists");
          endpoint = `/api/v2/folder/${folderId}/list`;
          break;
        case "getTasks":
          if (!listId) throw new Error("listId required for getTasks");
          endpoint = `/api/v2/list/${listId}/task`;
          if (queryParams) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(queryParams)) {
              params.append(key, String(value));
            }
            endpoint += `?${params.toString()}`;
          }
          break;
        case "getTask":
          if (!taskId) throw new Error("taskId required for getTask");
          endpoint = `/api/v2/task/${taskId}`;
          break;
        case "createTask":
          if (!listId) throw new Error("listId required for createTask");
          if (!data) throw new Error("data required for createTask");
          endpoint = `/api/v2/list/${listId}/task`;
          method = "POST";
          break;
        case "updateTask":
          if (!taskId) throw new Error("taskId required for updateTask");
          if (!data) throw new Error("data required for updateTask");
          endpoint = `/api/v2/task/${taskId}`;
          method = "PUT";
          break;
        case "deleteTask":
          if (!taskId) throw new Error("taskId required for deleteTask");
          endpoint = `/api/v2/task/${taskId}`;
          method = "DELETE";
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const result = await callMatonApi(endpoint, method, apiKey, pluginCfg.connectionId, data);

      return {
        success: true,
        action,
        result,
      };
    },
  };
}
