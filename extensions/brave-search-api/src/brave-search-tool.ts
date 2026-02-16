import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

async function callBraveSearchApi(
  query: string,
  apiKey: string,
  count: number = 10,
): Promise<unknown> {
  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
  });

  const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave Search API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function createBraveSearchTool(api: OpenClawPluginApi) {
  return {
    name: "brave-search",
    label: "Brave Search",
    description:
      "Perform web searches using the Brave Search API. Returns search results with titles, URLs, and descriptions. Requires BRAVE_API_KEY.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      count: Type.Optional(
        Type.Number({
          description: "Number of results to return (default: 10, max: 20)",
          minimum: 1,
          maximum: 20,
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const pluginCfg = api.pluginConfig as Record<string, unknown> | undefined;
      const apiKey =
        (pluginCfg?.apiKey as string) ||
        process.env.BRAVE_API_KEY ||
        process.env.BRAVE_SEARCH_API_KEY;

      if (!apiKey) {
        throw new Error(
          "Brave Search API key not configured. " +
            "Set BRAVE_API_KEY in your environment, or add apiKey to this plugin's config. " +
            "Register at https://api-dashboard.search.brave.com/register " +
            "then copy your key from https://api-dashboard.search.brave.com/app/keys",
        );
      }

      const query = params.query as string;
      const count = (params.count as number) || 10;

      if (!query || !query.trim()) {
        throw new Error("query is required and cannot be empty");
      }

      const result = await callBraveSearchApi(query, apiKey, count);

      return {
        success: true,
        query,
        count,
        result,
      };
    },
  };
}
