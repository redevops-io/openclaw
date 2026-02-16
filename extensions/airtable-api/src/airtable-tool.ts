import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

async function callAirtableApi(
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

  const url = `https://gateway.maton.ai/airtable${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function createAirtableTool(api: OpenClawPluginApi) {
  return {
    name: "airtable",
    label: "Airtable",
    description:
      "Interact with Airtable API to manage bases, tables, and records via Maton OAuth gateway.",
    parameters: Type.Object({
      action: Type.Union(
        [
          Type.Literal("listBases"),
          Type.Literal("getBaseSchema"),
          Type.Literal("listRecords"),
          Type.Literal("getRecord"),
          Type.Literal("createRecords"),
          Type.Literal("updateRecords"),
          Type.Literal("deleteRecords"),
        ],
        { description: "The Airtable API action to perform" },
      ),
      baseId: Type.Optional(Type.String({ description: "Base ID (starts with 'app')" })),
      tableIdOrName: Type.Optional(Type.String({ description: "Table ID or name" })),
      recordId: Type.Optional(Type.String({ description: "Record ID (starts with 'rec')" })),
      records: Type.Optional(
        Type.Array(
          Type.Object({}, { additionalProperties: true }),
          { description: "Records for create/update operations" },
        ),
      ),
      filterByFormula: Type.Optional(Type.String({ description: "Airtable formula filter" })),
      maxRecords: Type.Optional(Type.Number({ description: "Maximum records to return" })),
      view: Type.Optional(Type.String({ description: "View name to use" })),
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
      const baseId = params.baseId as string | undefined;
      const tableIdOrName = params.tableIdOrName as string | undefined;
      const recordId = params.recordId as string | undefined;
      const records = params.records as Array<Record<string, unknown>> | undefined;

      let endpoint = "";
      let method = "GET";
      let body: unknown = undefined;

      switch (action) {
        case "listBases":
          endpoint = "/v0/meta/bases";
          break;
        case "getBaseSchema":
          if (!baseId) throw new Error("baseId required for getBaseSchema");
          endpoint = `/v0/meta/bases/${baseId}/tables`;
          break;
        case "listRecords":
          if (!baseId || !tableIdOrName)
            throw new Error("baseId and tableIdOrName required for listRecords");
          endpoint = `/v0/${baseId}/${encodeURIComponent(tableIdOrName)}`;
          const queryParams = new URLSearchParams();
          if (params.maxRecords) queryParams.append("maxRecords", String(params.maxRecords));
          if (params.view) queryParams.append("view", String(params.view));
          if (params.filterByFormula)
            queryParams.append("filterByFormula", String(params.filterByFormula));
          if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;
          break;
        case "getRecord":
          if (!baseId || !tableIdOrName || !recordId)
            throw new Error("baseId, tableIdOrName, and recordId required for getRecord");
          endpoint = `/v0/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`;
          break;
        case "createRecords":
          if (!baseId || !tableIdOrName || !records)
            throw new Error("baseId, tableIdOrName, and records required for createRecords");
          endpoint = `/v0/${baseId}/${encodeURIComponent(tableIdOrName)}`;
          method = "POST";
          body = { records };
          break;
        case "updateRecords":
          if (!baseId || !tableIdOrName || !records)
            throw new Error("baseId, tableIdOrName, and records required for updateRecords");
          endpoint = `/v0/${baseId}/${encodeURIComponent(tableIdOrName)}`;
          method = "PATCH";
          body = { records };
          break;
        case "deleteRecords":
          if (!baseId || !tableIdOrName)
            throw new Error("baseId and tableIdOrName required for deleteRecords");
          if (!Array.isArray(params.recordIds) || params.recordIds.length === 0)
            throw new Error("recordIds array required for deleteRecords");
          endpoint = `/v0/${baseId}/${encodeURIComponent(tableIdOrName)}`;
          const deleteParams = new URLSearchParams();
          for (const rid of params.recordIds as string[]) {
            deleteParams.append("records[]", rid);
          }
          endpoint += `?${deleteParams.toString()}`;
          method = "DELETE";
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const result = await callAirtableApi(
        endpoint,
        method,
        apiKey,
        pluginCfg?.connectionId as string,
        body,
      );

      return {
        success: true,
        action,
        result,
      };
    },
  };
}
