/**
 * channel-read tool
 *
 * Reads recent messages from a Telegram channel and optionally
 * ingests them into the knowledge base. Uses the OpenClaw Telegram
 * channel plugin if available, falls back to agent conversation.
 */

import { Type } from "@sinclair/typebox";
import { type RagConfig, backendPost } from "./config.js";

export function createChannelReadTool(cfg: RagConfig) {
  return {
    name: "channel-read",
    label: "Read Telegram Channel",
    description:
      "Read recent messages from a Telegram channel or group chat. " +
      "Optionally ingest the content into the knowledge base and/or " +
      "analyze it for specific topics. Use this when the user asks " +
      'to "monitor", "read", or "check" a Telegram channel.',
    parameters: Type.Object({
      channel: Type.String({
        description: "Telegram channel/group identifier — @username or invite link",
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Number of recent messages to read (default: 50, max: 200)",
          minimum: 1,
          maximum: 200,
        }),
      ),
      topic: Type.Optional(
        Type.String({
          description:
            "Optional topic to focus on — if provided, only messages " +
            "related to this topic will be highlighted in the response",
        }),
      ),
      ingest: Type.Optional(
        Type.Boolean({
          description:
            "Whether to save the channel content into the knowledge base " + "(default: true)",
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const channel = params.channel as string;
      if (!channel?.trim()) {
        throw new Error("channel is required (e.g. @channelname or invite link)");
      }
      if (!cfg.workspaceId) {
        throw new Error("WORKSPACE_ID not configured.");
      }

      const limit = (params.limit as number) || 50;
      const topic = params.topic as string | undefined;
      const shouldIngest = params.ingest !== false; // default true

      // Delegate the actual Telegram reading to the backend, which
      // has access to the Telegram bot client.
      const data = (await backendPost(cfg, "/internal/duckdb/channel-read", {
        workspace_id: cfg.workspaceId,
        channel,
        limit,
        topic,
        ingest: shouldIngest,
      })) as {
        success: boolean;
        messages?: Array<{ text: string; date?: string; sender?: string }>;
        message_count?: number;
        ingested?: boolean;
        analysis?: string;
        error?: string;
      };

      if (!data.success) {
        return {
          success: false,
          message:
            data.error ||
            `Failed to read channel ${channel}. The bot may not have ` +
              "access to this channel. Make sure the bot is a member.",
        };
      }

      return {
        success: true,
        channel,
        message_count: data.message_count || data.messages?.length || 0,
        ingested: data.ingested ?? shouldIngest,
        analysis: data.analysis,
        messages: data.messages?.slice(0, 20), // cap preview to 20
        message:
          `Read ${data.message_count || 0} messages from ${channel}.` +
          (data.ingested ? " Content saved to knowledge base." : ""),
      };
    },
  };
}
