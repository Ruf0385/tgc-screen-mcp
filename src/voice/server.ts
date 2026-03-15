import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  sendKeysToTgc,
  isTgcRunning,
  launchTgc2019,
  CLUB_KEYS,
  CAMERA_KEYS,
  OVERLAY_KEYS,
  ACTION_KEYS,
} from "../lib/helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Tool definitions for OpenAI Realtime ──────────────────────────────

const TOOLS = [
  {
    type: "function" as const,
    name: "tgc_status",
    description: "Check if The Golf Club 2019 is currently running.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function" as const,
    name: "launch_tgc_2019",
    description: "Launch The Golf Club 2019 through Steam.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function" as const,
    name: "tgc_select_club",
    description:
      "Select a golf club. Valid: driver, 3wood, 5wood, 3iron, 4iron, 5iron, 6iron, 7iron, 8iron, 9iron, pw (pitching wedge), sw (sand wedge), lw (lob wedge), putter.",
    parameters: {
      type: "object",
      properties: { club: { type: "string", description: "Club name" } },
      required: ["club"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_club_up_down",
    description: "Cycle club up (more club) or down (less club).",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["up", "down"] },
        taps: { type: "number", description: "Number of steps (default 1)" },
      },
      required: ["direction"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_aim",
    description: "Aim left or right. Use taps > 1 for bigger adjustments.",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["left", "right"] },
        taps: { type: "number", description: "Number of taps (default 1)" },
      },
      required: ["direction"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_camera",
    description:
      "Change camera view. Modes: scout (view landing area), green/overhead (aerial green), flyover (hole flyover), cycle/view (cycle perspectives).",
    parameters: {
      type: "object",
      properties: { mode: { type: "string", description: "Camera mode" } },
      required: ["mode"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_toggle_overlay",
    description:
      "Toggle overlay: grid (green grid), lie (lie grid), flag (remove/show flag), data/info (shot data).",
    parameters: {
      type: "object",
      properties: { overlay: { type: "string", description: "Overlay name" } },
      required: ["overlay"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_game_action",
    description:
      "Game actions: pause/menu (ESC), advance/next (advance hole), rewind/mulligan (auto rewind), change shot (cycle shot type).",
    parameters: {
      type: "object",
      properties: { action: { type: "string", description: "Action name" } },
      required: ["action"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_move_ball",
    description: "Move ball position (only in drop/practice mode). Directions: forward, backward, left, right.",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["forward", "backward", "left", "right"] },
        taps: { type: "number", description: "Number of presses (default 1)" },
      },
      required: ["direction"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_press_key",
    description: "Send any key to TGC 2019. PowerShell SendKeys format: {ENTER}, {ESC}, {LEFT}, etc.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key in SendKeys format" },
        repeat: { type: "number", description: "Repeat count (default 1)" },
      },
      required: ["key"],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "tgc_status": {
        const running = await isTgcRunning();
        return running ? "TGC 2019 is running." : "TGC 2019 is not running.";
      }
      case "launch_tgc_2019": {
        await launchTgc2019();
        return "Launched TGC 2019 via Steam.";
      }
      case "tgc_select_club": {
        const club = String(args.club ?? "").toLowerCase().trim();
        const key = CLUB_KEYS[club];
        if (!key) return `Unknown club "${club}". Try: driver, 7iron, pw, putter, etc.`;
        const r = await sendKeysToTgc([key]);
        return `Selected ${club}.${r.activated ? "" : " Warning: TGC window not found."}`;
      }
      case "tgc_club_up_down": {
        const dir = String(args.direction);
        const n = Number(args.taps ?? 1);
        const key = dir === "up" ? "x" : "z";
        await sendKeysToTgc(Array(n).fill(key));
        return `Club ${dir} x${n}.`;
      }
      case "tgc_aim": {
        const dir = String(args.direction);
        const n = Number(args.taps ?? 1);
        const key = dir === "left" ? "{LEFT}" : "{RIGHT}";
        await sendKeysToTgc(Array(n).fill(key));
        return `Aimed ${dir} x${n}.`;
      }
      case "tgc_camera": {
        const mode = String(args.mode ?? "").toLowerCase().trim();
        const key = CAMERA_KEYS[mode];
        if (!key) return `Unknown camera mode "${mode}". Try: scout, green, flyover, cycle.`;
        await sendKeysToTgc([key]);
        return `Camera: ${mode}.`;
      }
      case "tgc_toggle_overlay": {
        const overlay = String(args.overlay ?? "").toLowerCase().trim();
        const key = OVERLAY_KEYS[overlay];
        if (!key) return `Unknown overlay "${overlay}". Try: grid, lie, flag, data.`;
        await sendKeysToTgc([key]);
        return `Toggled ${overlay}.`;
      }
      case "tgc_game_action": {
        const action = String(args.action ?? "").toLowerCase().trim();
        const key = ACTION_KEYS[action];
        if (!key) return `Unknown action "${action}". Try: pause, advance, rewind, change shot.`;
        await sendKeysToTgc([key]);
        return `Action: ${action}.`;
      }
      case "tgc_move_ball": {
        const dir = String(args.direction);
        const n = Number(args.taps ?? 1);
        const keyMap: Record<string, string> = { forward: "w", backward: "s", left: "a", right: "d" };
        const key = keyMap[dir] ?? "w";
        await sendKeysToTgc(Array(n).fill(key));
        return `Moved ball ${dir} x${n}.`;
      }
      case "tgc_press_key": {
        const key = String(args.key);
        const n = Number(args.repeat ?? 1);
        await sendKeysToTgc(Array(n).fill(key));
        return `Sent "${key}" x${n}.`;
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Voice server ──────────────────────────────────────────────────────

export function startVoiceServer(port: number, apiKey: string) {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Serve the web UI
  app.use(express.static(path.join(__dirname, "../../public")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", tools: TOOLS.length });
  });

  wss.on("connection", (browserWs) => {
    console.error("[voice] Browser connected");

    // Connect to OpenAI Realtime
    const model = process.env.REALTIME_MODEL || "gpt-4o-mini-realtime-preview";
    const openaiWs = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${model}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      }
    );

    openaiWs.on("open", () => {
      console.error("[voice] Connected to OpenAI Realtime");

      // Configure session with TGC tools
      openaiWs.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: `You are Adam's golf caddy AI. You control The Golf Club 2019 simulator via voice commands. 

When Adam asks you to do something in the game, call the appropriate tool immediately — don't ask for confirmation.

Examples of what Adam might say:
- "Give me the 7 iron" → call tgc_select_club with club "7iron"
- "Club up" → call tgc_club_up_down with direction "up"  
- "Aim left a bit" → call tgc_aim with direction "left", taps 1
- "Aim way right" → call tgc_aim with direction "right", taps 5
- "Show me the green" → call tgc_camera with mode "green"
- "Flyover" → call tgc_camera with mode "flyover"
- "Turn on the grid" → call tgc_toggle_overlay with overlay "grid"
- "Next hole" → call tgc_game_action with action "advance"
- "Mulligan" or "Let me redo that" → call tgc_game_action with action "rewind"
- "Pause" or "Menu" → call tgc_game_action with action "pause"
- "Launch the game" → call launch_tgc_2019

Keep responses SHORT — this is real-time voice during gameplay. Acknowledge with 2-5 words max: "7 iron, got it." "Aimed left." "Grid's on." Don't narrate what you're doing.

Be a great caddy: confident, brief, and responsive.`,
            voice: "ash",
            modalities: ["audio", "text"],
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            tools: TOOLS,
          },
        })
      );
    });

    // Relay OpenAI messages to browser (audio, transcripts)
    openaiWs.on("message", async (data) => {
      const event = JSON.parse(data.toString());

      // Handle tool calls
      if (event.type === "response.function_call_arguments.done") {
        const toolName = event.name;
        const toolArgs = JSON.parse(event.arguments || "{}");
        console.error(`[voice] Tool call: ${toolName}(${JSON.stringify(toolArgs)})`);

        const result = await executeTool(toolName, toolArgs);
        console.error(`[voice] Tool result: ${result}`);

        // Send tool result back to OpenAI
        openaiWs.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: event.call_id,
              output: result,
            },
          })
        );

        // Trigger a response after tool execution
        openaiWs.send(JSON.stringify({ type: "response.create" }));
        return;
      }

      // Forward audio and transcript events to browser
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.send(data.toString());
      }
    });

    // Relay browser audio to OpenAI
    browserWs.on("message", (data) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(data.toString());
      }
    });

    // Cleanup
    browserWs.on("close", () => {
      console.error("[voice] Browser disconnected");
      openaiWs.close();
    });

    openaiWs.on("close", () => {
      console.error("[voice] OpenAI disconnected");
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.send(JSON.stringify({ type: "error", message: "OpenAI connection closed" }));
      }
    });

    openaiWs.on("error", (err) => {
      console.error("[voice] OpenAI error:", err.message);
    });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.error(`\n🎙️  TGC Voice Caddy running at http://localhost:${port}`);
    console.error(`   Open in your browser to start talking.\n`);
  });
}
