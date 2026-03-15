import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { pressEnterOnTgc2019 } from "../lib/helpers.js";

export function registerPressEnterTgc2019Tool(server: McpServer) {
  server.tool(
    "press_enter_tgc_2019",
    "Attempt to activate The Golf Club 2019 window and simulate pressing Enter.",
    {},
    async () => {
      try {
        const { stdout, stderr } = await pressEnterOnTgc2019();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ stdout, stderr }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
