import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OVERLAY_KEYS, sendKeysToTgc } from "../lib/helpers.js";

export function registerTgcToggleOverlayTool(server: McpServer) {
  server.tool(
    "tgc_toggle_overlay",
    "Toggle an overlay in TGC 2019. Overlays: grid (G — green grid), lie (L — lie grid), flag (F — remove/show flag), data/info (I — shot data window).",
    {
      overlay: z.string().describe("Overlay to toggle: grid, lie, flag, data, info"),
    },
    async ({ overlay }) => {
      try {
        const key = OVERLAY_KEYS[overlay.toLowerCase().trim()];
        if (!key) {
          return {
            content: [{
              type: "text",
              text: `Unknown overlay "${overlay}". Valid: grid, lie, flag, data, info`,
            }],
            isError: true,
          };
        }

        const result = await sendKeysToTgc([key]);
        return {
          content: [{
            type: "text",
            text: `Toggled ${overlay}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found."}`,
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
