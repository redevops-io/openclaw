import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

async function callAsanaApi(
  endpoint: string,
  method: string,
  apiKey: string,
  connectionId?: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (connectionId) {
    headers["Maton-Connection"] = connectionId;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const url = `https://gateway.maton.ai/asana${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Asana API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function createAsanaTool(api: OpenClawPluginApi) {
  return {
    name: "asana",
    label: "Asana",
    description:
      "Interact with Asana API to manage tasks, projects, and workspaces via Maton OAuth gateway.",
    parameters: Type.Object({
      action: Type.Union(
        [
          Type.Literal("getTasks"),
          Type.Literal("getTask"),
          Type.Literal("createTask"),
          Type.Literal("updateTask"),
          Type.Literal("deleteTask"),
          Type.Literal("getProjects"),
          Type.Literal("getProject"),
          Type.Literal("getWorkspaces"),
        ],
        { description: "The Asana API action to perform" },
      ),
      projectGid: Type.Optional(Type.String({ description: "Project GID" })),
      taskGid: Type.Optional(Type.String({ description: "Task GID" })),
      workspaceGid: Type.Optional(Type.String({ description: "Workspace GID" })),
      data: Type.Optional(
        Type.Object(
          {},
          {
            description: "Task/project data for create/update operations",
            additionalProperties: true,
          },
        ),
      ),
      optFields: Type.Optional(Type.String({ description: "Comma-separated fields to include" })),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const pluginCfg = api.pluginConfig as Record<string, unknown> | undefined;
      const apiKey = (pluginCfg?.apiKey as string) || process.env.MATON_API_KEY;

      if (!apiKey) {
        throw new Error(
          "MATON_API_KEY not configured. Set it in plugin config or environment variable.",
        );
      }

      const action = params.action as string;
      const data = params.data as Record<string, unknown> | undefined;

      let endpoint = "";
      let method = "GET";

      switch (action) {
        case "getTasks":
          endpoint = "/api/1.0/tasks";
          if (params.projectGid) {
            endpoint += `?project=${params.projectGid}`;
          }
          if (params.optFields) {
            endpoint += endpoint.includes("?") ? "&" : "?";
            endpoint += `opt_fields=${params.optFields}`;
          }
          break;
        case "getTask":
          if (!params.taskGid) throw new Error("taskGid required for getTask");
          endpoint = `/api/1.0/tasks/${params.taskGid}`;
          break;
        case "createTask":
          if (!data) throw new Error("data required for createTask");
          endpoint = "/api/1.0/tasks";
          method = "POST";
          break;
        case "updateTask":
          if (!params.taskGid) throw new Error("taskGid required for updateTask");
          if (!data) throw new Error("data required for updateTask");
          endpoint = `/api/1.0/tasks/${params.taskGid}`;
          method = "PUT";
          break;
        case "deleteTask":
          if (!params.taskGid) throw new Error("taskGid required for deleteTask");
          endpoint = `/api/1.0/tasks/${params.taskGid}`;
          method = "DELETE";
          break;
        case "getProjects":
          endpoint = "/api/1.0/projects";
          if (params.workspaceGid) {
            endpoint += `?workspace=${params.workspaceGid}`;
          }
          break;
        case "getProject":
          if (!params.projectGid) throw new Error("projectGid required for getProject");
          endpoint = `/api/1.0/projects/${params.projectGid}`;
          break;
        case "getWorkspaces":
          endpoint = "/api/1.0/workspaces";
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const result = await callAsanaApi(
        endpoint,
        method,
        apiKey,
        pluginCfg?.connectionId as string,
        data ? { data } : undefined,
      );

      return {
        success: true,
        action,
        result,
      };
    },
  };
}
