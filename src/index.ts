#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { registerTools } from "./tools/register.js";

const server = new McpServer({
  name: "tgc-screen-mcp",
  version: "1.1.0",
});

function parseArgs() {
  const args = process.argv.slice(2);
  let port: number | null = null;
  let host = "0.0.0.0";
  let voice = false;
  let voicePort = 3200;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if ((args[i] === "--host" || args[i] === "-h") && args[i + 1]) {
      host = args[i + 1];
      i++;
    } else if (args[i] === "--voice" || args[i] === "-v") {
      voice = true;
      // Check if next arg is a port number
      if (args[i + 1] && !args[i + 1].startsWith("-")) {
        voicePort = parseInt(args[i + 1], 10);
        i++;
      }
    } else if (args[i] === "--help") {
      console.log(`tgc-screen-mcp — MCP server for The Golf Club 2019

Usage:
  tgc-screen-mcp                    Start in stdio mode (for local MCP clients)
  tgc-screen-mcp --port 3100        Start in HTTP/SSE mode (for remote clients)
  tgc-screen-mcp --voice            Start Voice Caddy on port 3200
  tgc-screen-mcp --voice 3300       Start Voice Caddy on custom port

Options:
  --port, -p <port>    Run as HTTP/SSE server on this port
  --host, -h <host>    Bind address (default: 0.0.0.0)
  --voice, -v [port]   Start Voice Caddy web UI (default port: 3200)
  --help               Show this help message

Environment:
  OPENAI_API_KEY       Required for --voice mode
  REALTIME_MODEL       OpenAI Realtime model (default: gpt-4o-mini-realtime-preview)
`);
      process.exit(0);
    }
  }

  return { port, host, voice, voicePort };
}

async function startStdio() {
  await registerTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TGC Screen MCP server started (stdio mode)");
}

async function startHttp(port: number, host: string) {
  await registerTools(server);

  // Track active SSE transports by session
  const transports = new Map<string, SSEServerTransport>();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    // CORS headers for browser/remote clients
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (url.pathname === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ name: "tgc-screen-mcp", version: "1.0.0", status: "ok" }));
      return;
    }

    // SSE endpoint — client connects here to receive messages
    if (url.pathname === "/sse" && req.method === "GET") {
      const transport = new SSEServerTransport("/messages", res);
      const sessionId = transport.sessionId;
      transports.set(sessionId, transport);

      res.on("close", () => {
        transports.delete(sessionId);
        console.error(`SSE session ${sessionId} disconnected`);
      });

      await server.connect(transport);
      console.error(`SSE session ${sessionId} connected`);
      return;
    }

    // Message endpoint — client sends JSON-RPC messages here
    if (url.pathname === "/messages" && req.method === "POST") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId || !transports.has(sessionId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid or missing sessionId" }));
        return;
      }

      const transport = transports.get(sessionId)!;
      await transport.handlePostMessage(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(port, host, () => {
    console.error(`TGC Screen MCP server started (HTTP/SSE mode)`);
    console.error(`  Health:   http://${host}:${port}/`);
    console.error(`  SSE:      http://${host}:${port}/sse`);
    console.error(`  Messages: http://${host}:${port}/messages`);
    console.error(`  Voice can connect to: http://<your-ip>:${port}/sse`);
  });
}

async function main() {
  const { port, host, voice, voicePort } = parseArgs();

  if (voice) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Error: OPENAI_API_KEY environment variable is required for --voice mode");
      process.exit(1);
    }
    const { startVoiceServer } = await import("./voice/server.js");
    startVoiceServer(voicePort, apiKey);
  } else if (port !== null) {
    await startHttp(port, host);
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error("Error starting TGC Screen MCP server:", error);
  process.exit(1);
});
