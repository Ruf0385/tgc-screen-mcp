import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { latestCaptureReport, readJson } from "../lib/helpers.js";

export function registerGetLastCaptureTool(server: McpServer) {
  server.tool(
    "get_last_capture",
    "Return the most recent screen capture OCR report.",
    {},
    async () => {
      try {
        const reportPath = await latestCaptureReport();
        if (!reportPath) {
          return {
            content: [
              {
                type: "text",
                text: "No capture report exists yet.",
              },
            ],
          };
        }

        const report = await readJson(reportPath);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ reportPath, report }, null, 2),
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
