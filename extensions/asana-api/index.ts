import type { OpenClawPluginApi, AnyAgentTool } from "../../src/plugins/types.js";
import { createAsanaTool } from "./src/asana-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createAsanaTool(api) as unknown as AnyAgentTool, { optional: true });
}
