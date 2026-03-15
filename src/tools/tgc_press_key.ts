import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendKeysToTgc } from "../lib/helpers.js";

export function registerTgcPressKeyTool(server: McpServer) {
  server.tool(
    "tgc_press_key",
    "Send any arbitrary key or key combo to TGC 2019. Uses PowerShell SendKeys syntax. Common keys: {ENTER}, {ESC}, {LEFT}, {RIGHT}, {UP}, {DOWN}, {TAB}, {BACKSPACE}, {DELETE}, {F1}-{F12}. Modifiers: ^ (Ctrl), % (Alt), + (Shift). Examples: 'a', '{ENTER}', '^c' (Ctrl+C), '%{ENTER}' (Alt+Enter).",
    {
      key: z.string().describe("Key to send in PowerShell SendKeys format"),
      repeat: z.number().int().min(1).max(50).optional().describe("Number of times to send the key (default 1)"),
    },
    async ({ key, repeat }) => {
      try {
        const count = repeat ?? 1;
        const keys = Array(count).fill(key);
        const result = await sendKeysToTgc(keys);
        return {
          content: [{
            type: "text",
            text: `Sent "${key}" x${count}. ${result.activated ? "Sent to TGC 2019." : "Warning: TGC window not found — sent to active window."}`,
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
