import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DIRECTION_KEYS, sendKeysToTgc } from "../lib/helpers.js";

export function registerTgcMoveBallTool(server: McpServer) {
  server.tool(
    "tgc_move_ball",
    "Move ball position in TGC 2019 (only works in drop/unplayable/practice mode). Directions: forward (W), backward (S), left (A), right (D).",
    {
      direction: z.enum(["forward", "backward", "left", "right"]).describe("Direction to move the ball"),
      taps: z.number().int().min(1).max(20).optional().describe("Number of key presses (default 1)"),
    },
    async ({ direction, taps }) => {
      try {
        const count = taps ?? 1;
        const keyMap: Record<string, string> = {
          forward: "w", backward: "s", left: "a", right: "d",
        };
        const key = keyMap[direction];
        const keys = Array(count).fill(key);

        const result = await sendKeysToTgc(keys);
        return {
          content: [{
            type: "text",
            text: `Moved ball ${direction} x${count}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found."}`,
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
