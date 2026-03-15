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
    description: "Cycle club up (more club/longer) or down (less club/shorter). If user says 'club up 3', pass taps=3.",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["up", "down"] },
        taps: { type: "number", description: "Number of clubs to move. Match what user says. Default 1." },
      },
      required: ["direction"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_aim",
    description: "Aim left or right by pressing arrow keys. IMPORTANT: when user says a number ('aim right 5', 'left 3 times'), pass that number as taps. Each tap is one arrow key press.",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["left", "right"] },
        taps: { type: "number", description: "Number of arrow key presses. MUST match what user says. 'Right 5' = 5. 'Left a little' = 1. 'Way right' = 8." },
      },
      required: ["direction", "taps"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_camera",
    description:
      "Change camera view. Modes: scout (Q — view target/landing area), green/overhead (E — aerial green view for putting), flyover (H — fly the hole), cycle/view (V — cycle perspectives).",
    parameters: {
      type: "object",
      properties: { mode: { type: "string", description: "Camera mode: scout, green, overhead, flyover, cycle" } },
      required: ["mode"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_toggle_overlay",
    description:
      "Toggle an overlay. grid (G — green contour grid), lie (L — lie/slope grid), flag (F — remove/show flag stick), data/info (I — shot data/analysis window).",
    parameters: {
      type: "object",
      properties: { overlay: { type: "string", description: "Overlay: grid, lie, flag, data, info" } },
      required: ["overlay"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_game_action",
    description:
      "Game actions: pause/menu (ESC), advance/next (advance to next hole or confirm), rewind/mulligan (redo last shot), change shot/shot type (cycle: normal, punch, pitch, chip, flop).",
    parameters: {
      type: "object",
      properties: { action: { type: "string", description: "Action: pause, menu, advance, next, rewind, mulligan, change shot" } },
      required: ["action"],
    },
  },
  {
    type: "function" as const,
    name: "tgc_move_ball",
    description: "Move ball position (drop/practice mode only). WASD keys. Directions: forward, backward, left, right.",
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
    description: "Send any key to TGC 2019. PowerShell SendKeys format: {ENTER}, {ESC}, {LEFT}, etc. Use as fallback when no specific tool matches.",
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
        const n = Math.max(1, Number(args.taps ?? 1));
        const key = dir === "up" ? "x" : "z";
        await sendKeysToTgc(Array(n).fill(key));
        return `Club ${dir} ${n}.`;
      }
      case "tgc_aim": {
        const dir = String(args.direction);
        const n = Math.max(1, Number(args.taps ?? 1));
        const key = dir === "left" ? "{LEFT}" : "{RIGHT}";
        await sendKeysToTgc(Array(n).fill(key));
        return `Aimed ${dir} ${n}.`;
      }
      case "tgc_camera": {
        const mode = String(args.mode ?? "").toLowerCase().trim();
        const key = CAMERA_KEYS[mode];
        if (!key) return `Unknown camera mode "${mode}". Try: scout, green, flyover, cycle.`;
        await sendKeysToTgc([key]);
        return `Camera ${mode}.`;
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
        return `${action}.`;
      }
      case "tgc_move_ball": {
        const dir = String(args.direction);
        const n = Math.max(1, Number(args.taps ?? 1));
        const keyMap: Record<string, string> = { forward: "w", backward: "s", left: "a", right: "d" };
        const key = keyMap[dir] ?? "w";
        await sendKeysToTgc(Array(n).fill(key));
        return `Ball ${dir} ${n}.`;
      }
      case "tgc_press_key": {
        const key = String(args.key);
        const n = Math.max(1, Number(args.repeat ?? 1));
        await sendKeysToTgc(Array(n).fill(key));
        return `Key "${key}" x${n}.`;
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Caddy system prompt ───────────────────────────────────────────────

const CADDY_INSTRUCTIONS = `You are a golf caddy AI for The Golf Club 2019 simulator. Your name is Caddy. You sound like a real caddy — calm, knowledgeable, and a bit witty. Think of a PGA Tour caddy who's been on the bag for years.

PERSONALITY:
- Confident and experienced. You know the game.
- Brief but natural — not robotic. Vary your responses.
- Celebrate good moments: "Beauty." "That'll play." "Pin high, nice."
- Light humor when appropriate: "Bold choice." "Let's see if that holds."
- When something goes wrong, stay positive: "We'll get it back." "Shake it off."

RESPONSE STYLE:
- 3-8 words typically. Never more than one sentence.
- Vary your acknowledgments. Don't repeat the same phrase twice in a row.
- Good: "7 iron, 156 to the pin." / "Aimed right 5, should hold against the wind." / "Grid's up." / "Let's see it."
- Bad: "Done." "Done." "Done." (never just say "Done")

TOOL CALLING RULES:
1. Call tools IMMEDIATELY when the user gives a command. No hesitation.
2. When user says a NUMBER with aim/club commands, pass it as the taps parameter exactly. "Right 5" = taps:5. "Left 3" = taps:3.
3. Never ask for confirmation. Just do it.
4. After a tool executes, acknowledge naturally. Don't describe what happened technically.

GOLF KNOWLEDGE (TGC 2019 specific):
- Distance penalties: Light rough = 7% less distance. Heavy rough = 14% less. Bunker >40y = 7%. Bunker <40y = 40% penalty.
- Elevation: 1 yard adjustment per 3 feet of elevation change. Uphill = add yards, downhill = subtract.
- Putting elevation: Uphill = 1 foot per inch. Downhill = 2 feet per inch.
- Greens roll out ~20 yards. 9-iron rolls 8-10y, PW rolls ~5y. Often need one less club.
- Shot types cycle with C key: normal → punch → pitch → chip → flop.
- Scout camera (Q) shows the landing area — great for checking where the ball will end up.
- Green grid (G) shows contour lines for reading putts.

PROACTIVE CADDY BEHAVIOR:
- If the user seems unsure, offer a suggestion: "I'd go 7 iron here, what do you think?"
- If they ask about wind or distance, use your golf knowledge to give real advice.
- If they hit a bad shot, suggest recovery strategy.
- You can suggest using the scout camera or grid when it might help.

EXAMPLES OF NATURAL CADDY TALK:
User: "Give me the 7 iron" → [call tool] → "7 iron. Let's stick it."
User: "Aim right 5" → [call tool with taps:5] → "Aimed right 5. That should hold."
User: "Show me the green" → [call tool] → "There's your green. Pin's back left."
User: "Mulligan" → [call tool] → "Take another crack at it."
User: "What do you think here?" → "156 to the pin, wind's in your face. I'd go 6 iron, take one more club."
User: "Turn on the grid" → [call tool] → "Grid's up. Looks like it breaks left to right."
User: "Next hole" → [call tool] → "On to the next."
User: "Launch the game" → [call tool] → "Firing it up. Give it a sec."
User: "Club up" → [call tool] → "Went up one."
User: "Club up 2" → [call tool with taps:2] → "Two up. Big stick."`;

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
    const model = process.env.REALTIME_MODEL || "gpt-4o-realtime-preview";
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

      // Configure session with TGC tools and caddy personality
      openaiWs.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: CADDY_INSTRUCTIONS,
            voice: "ash",
            modalities: ["audio", "text"],
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 200,
              silence_duration_ms: 300,
            },
            tools: TOOLS,
            tool_choice: "auto",
            input_audio_transcription: {
              model: "whisper-1",
            },
          },
        })
      );
    });

    // Relay OpenAI messages to browser (audio, transcripts)
    openaiWs.on("message", async (data) => {
      const event = JSON.parse(data.toString());

      // Log non-audio events for debugging
      if (!event.type.includes("audio.delta") && !event.type.includes("audio_buffer")) {
        console.error(`[voice] Event: ${event.type}`);
      }

      // Log transcriptions
      if (event.type === "conversation.item.input_audio_transcription.completed") {
        console.error(`[voice] User said: "${event.transcript}"`);
      }
      if (event.type === "response.audio_transcript.done") {
        console.error(`[voice] Caddy said: "${event.transcript}"`);
      }

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
