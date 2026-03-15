import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendKeysToTgc } from "../lib/helpers.js";

export function registerTgcAimTool(server: McpServer) {
  server.tool(
    "tgc_aim",
    "Adjust aim direction in TGC 2019. Sends left/right arrow keys. Use taps > 1 for bigger adjustments.",
    {
      direction: z.enum(["left", "right"]).describe("Aim direction"),
      taps: z.number().int().min(1).max(20).optional().describe("Number of key presses (default 1, max 20)"),
    },
    async ({ direction, taps }) => {
      try {
        const count = taps ?? 1;
        const key = direction === "left" ? "{LEFT}" : "{RIGHT}";
        const keys = Array(count).fill(key);

        const result = await sendKeysToTgc(keys);
        return {
          content: [{
            type: "text",
            text: `Aimed ${direction} x${count}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found."}`,
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
