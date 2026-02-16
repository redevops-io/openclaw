import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

async function callWhatsAppBusinessApi(
  endpoint: string,
  method: string,
  apiKey: string,
  connectionId?: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (connectionId) {
    headers["Maton-Connection"] = connectionId;
  }

  const url = `https://gateway.maton.ai/whatsapp-business${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WhatsApp Business API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function createWhatsAppBusinessTool(api: OpenClawPluginApi) {
  return {
    name: "whatsapp-business",
    label: "WhatsApp Business",
    description:
      "Send WhatsApp Business messages (text, media, templates) via Maton OAuth gateway. Requires MATON_API_KEY.",
    parameters: Type.Object({
      phoneNumberId: Type.String({ description: "WhatsApp Business phone number ID" }),
      action: Type.Union(
        [
          Type.Literal("sendText"),
          Type.Literal("sendTemplate"),
          Type.Literal("sendImage"),
          Type.Literal("sendDocument"),
          Type.Literal("sendVideo"),
          Type.Literal("sendAudio"),
          Type.Literal("sendLocation"),
          Type.Literal("markRead"),
          Type.Literal("getPhoneNumber"),
          Type.Literal("getBusinessProfile"),
        ],
        { description: "The WhatsApp Business API action to perform" },
      ),
      to: Type.Optional(
        Type.String({ description: "Recipient phone number (international format, no +)" }),
      ),
      text: Type.Optional(Type.String({ description: "Message text" })),
      templateName: Type.Optional(Type.String({ description: "Template name" })),
      templateLanguage: Type.Optional(Type.String({ description: "Template language code" })),
      mediaUrl: Type.Optional(Type.String({ description: "Media URL for image/video/audio/document" })),
      caption: Type.Optional(Type.String({ description: "Media caption" })),
      filename: Type.Optional(Type.String({ description: "Document filename" })),
      latitude: Type.Optional(Type.Number({ description: "Location latitude" })),
      longitude: Type.Optional(Type.Number({ description: "Location longitude" })),
      locationName: Type.Optional(Type.String({ description: "Location name" })),
      locationAddress: Type.Optional(Type.String({ description: "Location address" })),
      messageId: Type.Optional(Type.String({ description: "Message ID to mark as read" })),
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
      const phoneNumberId = params.phoneNumberId as string;

      let endpoint = "";
      let method = "POST";
      let body: Record<string, unknown> = {};

      switch (action) {
        case "sendText":
          if (!params.to || !params.text)
            throw new Error("to and text required for sendText");
          endpoint = `/v21.0/${phoneNumberId}/messages`;
          body = {
            messaging_product: "whatsapp",
            to: params.to,
            type: "text",
            text: { body: params.text },
          };
          break;
        case "sendTemplate":
          if (!params.to || !params.templateName || !params.templateLanguage)
            throw new Error("to, templateName, and templateLanguage required for sendTemplate");
          endpoint = `/v21.0/${phoneNumberId}/messages`;
          body = {
            messaging_product: "whatsapp",
            to: params.to,
            type: "template",
            template: {
              name: params.templateName,
              language: { code: params.templateLanguage },
            },
          };
          break;
        case "sendImage":
        case "sendDocument":
        case "sendVideo":
        case "sendAudio":
          if (!params.to || !params.mediaUrl)
            throw new Error("to and mediaUrl required for media messages");
          endpoint = `/v21.0/${phoneNumberId}/messages`;
          const mediaType = action.replace("send", "").toLowerCase();
          body = {
            messaging_product: "whatsapp",
            to: params.to,
            type: mediaType,
            [mediaType]: {
              link: params.mediaUrl,
              ...(params.caption && { caption: params.caption }),
              ...(params.filename && { filename: params.filename }),
            },
          };
          break;
        case "sendLocation":
          if (!params.to || params.latitude === undefined || params.longitude === undefined)
            throw new Error("to, latitude, and longitude required for sendLocation");
          endpoint = `/v21.0/${phoneNumberId}/messages`;
          body = {
            messaging_product: "whatsapp",
            to: params.to,
            type: "location",
            location: {
              latitude: params.latitude,
              longitude: params.longitude,
              ...(params.locationName && { name: params.locationName }),
              ...(params.locationAddress && { address: params.locationAddress }),
            },
          };
          break;
        case "markRead":
          if (!params.messageId) throw new Error("messageId required for markRead");
          endpoint = `/v21.0/${phoneNumberId}/messages`;
          body = {
            messaging_product: "whatsapp",
            status: "read",
            message_id: params.messageId,
          };
          break;
        case "getPhoneNumber":
          endpoint = `/v21.0/${phoneNumberId}`;
          method = "GET";
          body = {};
          break;
        case "getBusinessProfile":
          endpoint = `/v21.0/${phoneNumberId}/whatsapp_business_profile`;
          method = "GET";
          body = {};
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const result = await callWhatsAppBusinessApi(
        endpoint,
        method,
        apiKey,
        pluginCfg?.connectionId as string,
        Object.keys(body).length > 0 ? body : undefined,
      );

      return {
        success: true,
        action,
        result,
      };
    },
  };
}
