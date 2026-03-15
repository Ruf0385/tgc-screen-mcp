import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CAPTURE_DIR, ensureCaptureDir, latestCaptureReport, readJson, runCommand } from "../lib/helpers.js";

const schema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  keyword: z.array(z.string()).optional(),
  captureBackend: z.enum(["auto", "windows", "mss", "pillow"]).optional(),
});

export function registerCaptureRegionTool(server: McpServer) {
  server.tool(
    "capture_region",
    "Capture a screen region, run OCR, and return the latest OCR summary.",
    {
      x: z.number().int().min(0).describe("Left coordinate in screen pixels"),
      y: z.number().int().min(0).describe("Top coordinate in screen pixels"),
      width: z.number().int().positive().describe("Capture width in pixels"),
      height: z.number().int().positive().describe("Capture height in pixels"),
      keyword: z.array(z.string()).optional().describe("Optional keywords to count in OCR text"),
      captureBackend: z.enum(["auto", "windows", "mss", "pillow"]).optional().describe("Capture backend"),
    },
    async (args) => {
      try {
        const validated = schema.parse(args);
        await ensureCaptureDir();
        const cliArgs = [
          "--region",
          String(validated.x),
          String(validated.y),
          String(validated.width),
          String(validated.height),
          "--output-dir",
          CAPTURE_DIR,
        ];

        if (validated.captureBackend) {
          cliArgs.push("--capture-backend", validated.captureBackend);
        }
        for (const kw of validated.keyword ?? []) {
          cliArgs.push("--keyword", kw);
        }

        const { stdout, stderr } = await runCommand("screen-capture-ocr", cliArgs);
        const reportPath = await latestCaptureReport();
        const report = reportPath ? await readJson(reportPath) : null;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ stdout, stderr, reportPath, report }, null, 2),
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
