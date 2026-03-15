import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Screen capture tools
import { registerCaptureRegionTool } from "./capture_region.js";
import { registerGetLastCaptureTool } from "./get_last_capture.js";

// Game lifecycle
import { registerLaunchTgc2019Tool } from "./launch_tgc_2019.js";
import { registerTgcStatusTool } from "./tgc_status.js";

// Club selection
import { registerTgcSelectClubTool } from "./tgc_select_club.js";
import { registerTgcClubUpDownTool } from "./tgc_club_up_down.js";

// Aim & ball movement
import { registerTgcAimTool } from "./tgc_aim.js";
import { registerTgcMoveBallTool } from "./tgc_move_ball.js";

// Camera
import { registerTgcCameraTool } from "./tgc_camera.js";

// Overlays & HUD
import { registerTgcToggleOverlayTool } from "./tgc_toggle_overlay.js";

// Game actions (pause, advance, rewind, etc.)
import { registerTgcGameActionTool } from "./tgc_game_action.js";

// Generic key fallback
import { registerTgcPressKeyTool } from "./tgc_press_key.js";

export async function registerTools(server: McpServer) {
  // Screen
  registerCaptureRegionTool(server);
  registerGetLastCaptureTool(server);

  // Lifecycle
  registerLaunchTgc2019Tool(server);
  registerTgcStatusTool(server);

  // Clubs
  registerTgcSelectClubTool(server);
  registerTgcClubUpDownTool(server);

  // Aim & movement
  registerTgcAimTool(server);
  registerTgcMoveBallTool(server);

  // Camera
  registerTgcCameraTool(server);

  // Overlays
  registerTgcToggleOverlayTool(server);

  // Actions
  registerTgcGameActionTool(server);

  // Generic key
  registerTgcPressKeyTool(server);
}
