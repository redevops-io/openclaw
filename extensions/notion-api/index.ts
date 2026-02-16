import type { OpenClawPluginApi, AnyAgentTool } from "../../src/plugins/types.js";
import { createNotionTool } from "./src/notion-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createNotionTool(api) as unknown as AnyAgentTool, { optional: true });
}
