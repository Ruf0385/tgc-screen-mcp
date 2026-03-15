# tgc-screen-mcp

MCP (Model Context Protocol) server for controlling **The Golf Club 2019** simulator. Provides tools for launching the game, capturing screen regions with OCR, and sending keyboard input — all via WSL↔Windows interop.

Built for use with [OpenClaw](https://github.com/openclaw/openclaw) and other MCP-compatible AI agents.

## Tools

| Tool | Description |
|------|-------------|
| `launch_tgc_2019` | Launch TGC 2019 via Steam URI |
| `press_enter_tgc_2019` | Activate TGC window and send Enter key |
| `capture_region` | Capture a screen region, run OCR, return results |
| `get_last_capture` | Return the most recent screen capture OCR report |

## Prerequisites

- **Windows 10/11** with WSL2
- **The Golf Club 2019** installed via Steam (App ID: 695290)
- **Node.js** 22+
- **screen-capture-ocr** CLI tool (for capture/OCR functionality)

## Setup

```bash
git clone https://github.com/Ruf0385/tgc-screen-mcp.git
cd tgc-screen-mcp
npm install
npm run build
```

## Usage

### As a standalone MCP server

```bash
npm start
```

### With OpenClaw

Add to your `openclaw.json` plugins config:

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

### With Claude Desktop / other MCP clients

Add to your MCP config:

```json
{
  "mcpServers": {
    "tgc-screen": {
      "command": "node",
      "args": ["/path/to/tgc-screen-mcp/dist/index.js"]
    }
  }
}
```

## How It Works

This server bridges WSL2 and Windows using:
- **Steam URI** (`steam://rungameid/695290`) for launching
- **PowerShell** via `/mnt/c/Windows/System32/WindowsPowerShell/` for window activation and keystrokes
- **screen-capture-ocr** for screen region capture and text extraction

## Roadmap

- [ ] `press_key` — generic key sending (Escape, arrow keys, etc.)
- [ ] `tgc_status` — detect if TGC is running
- [ ] `tgc_current_screen` — identify current menu/screen via OCR
- [ ] Menu navigation automation (course selection, settings)
- [ ] Score tracking and round history

## License

MIT
