import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isTgcRunning } from "../lib/helpers.js";

export function registerTgcStatusTool(server: McpServer) {
  server.tool(
    "tgc_status",
    "Check if The Golf Club 2019 is currently running.",
    {},
    async () => {
      try {
        const running = await isTgcRunning();
        return {
          content: [{
            type: "text",
            text: running
              ? "TGC 2019 is running."
              : "TGC 2019 is not running. Use launch_tgc_2019 to start it.",
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
