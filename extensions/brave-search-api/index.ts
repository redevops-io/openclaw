import type { OpenClawPluginApi, AnyAgentTool } from "../../src/plugins/types.js";
import { createBraveSearchTool } from "./src/brave-search-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createBraveSearchTool(api) as unknown as AnyAgentTool, { optional: true });
}
