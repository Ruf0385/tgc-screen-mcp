import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CLUB_KEYS, sendKeysToTgc } from "../lib/helpers.js";

const clubNames = Object.keys(CLUB_KEYS);

export function registerTgcSelectClubTool(server: McpServer) {
  server.tool(
    "tgc_select_club",
    `Select a golf club in TGC 2019. Valid clubs: driver, 3wood, 5wood, 3iron, 4iron, 5iron, 6iron, 7iron, 8iron, 9iron, pw (pitching wedge), sw (sand wedge), lw (lob wedge), putter. Also accepts formats like "7-iron", "7i", "sand wedge".`,
    {
      club: z.string().describe("Club name (e.g. driver, 7iron, pw, putter)"),
    },
    async ({ club }) => {
      try {
        const key = CLUB_KEYS[club.toLowerCase().trim()];
        if (!key) {
          return {
            content: [{
              type: "text",
              text: `Unknown club "${club}". Valid: ${[...new Set(Object.values(CLUB_KEYS))].length} clubs. Try: driver, 3wood, 5wood, 3iron-9iron, pw, sw, lw, putter`,
            }],
            isError: true,
          };
        }

        const result = await sendKeysToTgc([key]);
        return {
          content: [{
            type: "text",
            text: `Selected ${club}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found — key sent to active window."}`,
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
