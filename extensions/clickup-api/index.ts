import type { OpenClawPluginApi, AnyAgentTool } from "../../src/plugins/types.js";
import { createClickUpTool } from "./src/clickup-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createClickUpTool(api) as unknown as AnyAgentTool, { optional: true });
}
