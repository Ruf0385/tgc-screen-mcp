import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCaptureRegionTool } from "./capture_region.js";
import { registerGetLastCaptureTool } from "./get_last_capture.js";
import { registerLaunchTgc2019Tool } from "./launch_tgc_2019.js";
import { registerPressEnterTgc2019Tool } from "./press_enter_tgc_2019.js";

export async function registerTools(server: McpServer) {
  registerCaptureRegionTool(server);
  registerGetLastCaptureTool(server);
  registerLaunchTgc2019Tool(server);
  registerPressEnterTgc2019Tool(server);
}
