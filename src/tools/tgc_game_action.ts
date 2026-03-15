import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ACTION_KEYS, sendKeysToTgc } from "../lib/helpers.js";

export function registerTgcGameActionTool(server: McpServer) {
  server.tool(
    "tgc_game_action",
    "Perform a game action in TGC 2019. Actions: pause/menu (ESC), advance/next (ENTER — advance hole or confirm), rewind/mulligan (R — auto rewind), change shot/chip/flop/punch (C — cycle shot type), windowed (Alt+Enter — toggle windowed mode).",
    {
      action: z.string().describe("Action: pause, menu, advance, next, rewind, mulligan, change shot, windowed"),
    },
    async ({ action }) => {
      try {
        const key = ACTION_KEYS[action.toLowerCase().trim()];
        if (!key) {
          return {
            content: [{
              type: "text",
              text: `Unknown action "${action}". Valid: pause, menu, advance, next, rewind, mulligan, change shot, windowed`,
            }],
            isError: true,
          };
        }

        const result = await sendKeysToTgc([key]);
        return {
          content: [{
            type: "text",
            text: `Action: ${action}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found."}`,
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
