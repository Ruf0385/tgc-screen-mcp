# tgc-screen-mcp

MCP (Model Context Protocol) server for controlling **The Golf Club 2019** simulator. Provides 12 tools for launching the game, selecting clubs, aiming, camera control, overlays, and screen capture with OCR — all via WSL↔Windows interop.

Built for voice-controlled golf with [OpenClaw](https://github.com/openclaw/openclaw) and compatible with any MCP client (Claude Desktop, etc.).

## Install

```bash
# Install globally from GitHub
npm install -g github:Ruf0385/tgc-screen-mcp

# Or clone and build
git clone https://github.com/Ruf0385/tgc-screen-mcp.git
cd tgc-screen-mcp
npm install
```

## Quick Start

### Local (stdio) — same machine as TGC
```bash
tgc-screen-mcp
```

### Remote (HTTP/SSE) — Voice from another computer
```bash
# On the TGC machine:
tgc-screen-mcp --port 3100

# Voice/client connects to: http://<tgc-machine-ip>:3100/sse
```

## Tools (12 total)

### Game Lifecycle
| Tool | Description |
|------|-------------|
| `tgc_status` | Check if TGC 2019 is running |
| `launch_tgc_2019` | Launch via Steam |

### Club Selection
| Tool | Description |
|------|-------------|
| `tgc_select_club` | Select any club by name (driver, 7iron, pw, putter, etc.) |
| `tgc_club_up_down` | Cycle club up (X) or down (Z) |

### Aiming & Movement
| Tool | Description |
|------|-------------|
| `tgc_aim` | Aim left/right with adjustable taps |
| `tgc_move_ball` | Move ball (WASD) in drop/practice mode |

### Camera
| Tool | Description |
|------|-------------|
| `tgc_camera` | Scout, green overhead, hole flyover, cycle views |

### Overlays & HUD
| Tool | Description |
|------|-------------|
| `tgc_toggle_overlay` | Green grid, lie grid, flag, shot data |

### Game Actions
| Tool | Description |
|------|-------------|
| `tgc_game_action` | Pause, advance hole, rewind/mulligan, change shot type |
| `tgc_press_key` | Send any arbitrary key (generic fallback) |

### Screen Capture
| Tool | Description |
|------|-------------|
| `capture_region` | Capture a screen region with OCR |
| `get_last_capture` | Get the most recent OCR report |

## Voice Examples

Just talk naturally — the AI maps your words to the right tool:

- *"Launch the game"* → `launch_tgc_2019`
- *"Give me the 7 iron"* → `tgc_select_club(club: "7iron")`
- *"Club up"* → `tgc_club_up_down(direction: "up")`
- *"Aim left a bit"* → `tgc_aim(direction: "left", taps: 1)`
- *"Aim way right"* → `tgc_aim(direction: "right", taps: 5)`
- *"Show me the green"* → `tgc_camera(mode: "green")`
- *"Hole flyover"* → `tgc_camera(mode: "flyover")`
- *"Turn on the grid"* → `tgc_toggle_overlay(overlay: "grid")`
- *"Next hole"* → `tgc_game_action(action: "advance")`
- *"Mulligan"* → `tgc_game_action(action: "rewind")`
- *"Pause"* → `tgc_game_action(action: "pause")`

## Setup with OpenClaw

### Local (same machine as TGC)

Add to `openclaw.json`:
```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "config": {
          "mcpServers": {
            "tgc-screen": {
              "command": "tgc-screen-mcp"
            }
          }
        }
      }
    }
  }
}
```

### Remote (Voice on a different machine)

On the **TGC machine**, start the HTTP server:
```bash
tgc-screen-mcp --port 3100
```

On the **Voice machine**, point OpenClaw to the remote server:
```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "config": {
          "mcpServers": {
            "tgc-screen": {
              "url": "http://<tgc-machine-ip>:3100/sse"
            }
          }
        }
      }
    }
  }
}
```

If both machines are on Tailscale, use the Tailscale hostname instead of a raw IP.

### Claude Desktop / Other MCP Clients

```json
{
  "mcpServers": {
    "tgc-screen": {
      "command": "tgc-screen-mcp"
    }
  }
}
```

## Prerequisites

- **Windows 10/11** with WSL2 (on the TGC machine)
- **The Golf Club 2019** installed via Steam (App ID: 695290)
- **Node.js** 22+
- **screen-capture-ocr** CLI tool (for capture/OCR functionality)

## How It Works

This server bridges WSL2 and Windows using:
- **Steam URI** (`steam://rungameid/695290`) for launching
- **PowerShell** via `/mnt/c/Windows/System32/WindowsPowerShell/` for window activation and keystrokes
- **screen-capture-ocr** for screen region capture and text extraction

### Two Transport Modes

| Mode | Command | Use Case |
|------|---------|----------|
| **stdio** | `tgc-screen-mcp` | Local MCP client on the same machine |
| **HTTP/SSE** | `tgc-screen-mcp --port 3100` | Remote clients (Voice, phone, another PC) |

## Keyboard Reference

All TGC 2019 keyboard shortcuts are mapped:

| Category | Keys |
|----------|------|
| Clubs | `` ` ``=Driver, `1`=3W, `2`=5W, `3-9`=Irons, `0`=PW, `-`=SW, `=`=LW, `P`=Putter |
| Aim | ← → Arrow keys |
| Camera | `Q`=Scout, `E`=Green, `H`=Flyover, `V`=Cycle |
| Overlays | `G`=Grid, `L`=Lie, `F`=Flag, `I`=Data |
| Actions | `ESC`=Pause, `Enter`=Advance, `R`=Rewind, `C`=Shot type |
| Ball | `W/A/S/D`=Move (drop/practice mode) |
| Club cycle | `X`=Up, `Z`=Down |

## License

MIT
