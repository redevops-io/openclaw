import type { OpenClawPluginApi, AnyAgentTool } from "../../src/plugins/types.js";
import { createWhatsAppBusinessTool } from "./src/whatsapp-business-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createWhatsAppBusinessTool(api) as unknown as AnyAgentTool, { optional: true });
}
