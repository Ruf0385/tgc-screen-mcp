import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/register.js";

const server = new McpServer({
  name: "tgc-screen-mcp",
  version: "1.0.0",
});

async function main() {
  await registerTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TGC Screen MCP server started");
}

main().catch((error) => {
  console.error("Error starting TGC Screen MCP server:", error);
  process.exit(1);
});
