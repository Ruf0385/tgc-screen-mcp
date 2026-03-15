import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { launchTgc2019 } from "../lib/helpers.js";

export function registerLaunchTgc2019Tool(server: McpServer) {
  server.tool(
    "launch_tgc_2019",
    "Launch The Golf Club 2019 through the local Steam URI.",
    {},
    async () => {
      try {
        await launchTgc2019();
        return {
          content: [
            {
              type: "text",
              text: "Launched The Golf Club 2019 through Steam.",
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
