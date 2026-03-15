import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CAMERA_KEYS, sendKeysToTgc } from "../lib/helpers.js";

export function registerTgcCameraTool(server: McpServer) {
  server.tool(
    "tgc_camera",
    "Change camera view in TGC 2019. Modes: scout (Q — view landing area), green/overhead (E — aerial green view), flyover (H — hole flyover), cycle/view (V — cycle through perspectives).",
    {
      mode: z.string().describe("Camera mode: scout, green, overhead, flyover, cycle, view"),
    },
    async ({ mode }) => {
      try {
        const key = CAMERA_KEYS[mode.toLowerCase().trim()];
        if (!key) {
          return {
            content: [{
              type: "text",
              text: `Unknown camera mode "${mode}". Valid: scout, green, overhead, flyover, cycle, view`,
            }],
            isError: true,
          };
        }

        const result = await sendKeysToTgc([key]);
        return {
          content: [{
            type: "text",
            text: `Camera: ${mode}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found."}`,
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
