import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendKeysToTgc } from "../lib/helpers.js";

export function registerTgcClubUpDownTool(server: McpServer) {
  server.tool(
    "tgc_club_up_down",
    "Cycle club up (X) or down (Z) in TGC 2019. Use when you want to go one club up or down from current selection.",
    {
      direction: z.enum(["up", "down"]).describe("up = more club (X), down = less club (Z)"),
      taps: z.number().int().min(1).max(10).optional().describe("Number of steps (default 1)"),
    },
    async ({ direction, taps }) => {
      try {
        const count = taps ?? 1;
        const key = direction === "up" ? "x" : "z";
        const keys = Array(count).fill(key);

        const result = await sendKeysToTgc(keys);
        return {
          content: [{
            type: "text",
            text: `Club ${direction} x${count}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found."}`,
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
