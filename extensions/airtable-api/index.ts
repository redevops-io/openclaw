import type { OpenClawPluginApi, AnyAgentTool } from "../../src/plugins/types.js";
import { createAirtableTool } from "./src/airtable-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createAirtableTool(api) as unknown as AnyAgentTool, { optional: true });
}
