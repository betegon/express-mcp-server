
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: "https://c0e0d4cfc3c07b592746f3206d02d508@o447951.ingest.us.sentry.io/4509521091297281",
  spotlight: true,
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  environment: process.env.NODE_ENV || 'development',
  tracePropagationTargets: ['localhost', /^https:\/\/yourapi\.domain\.com\/api/],
  integrations: [
    Sentry.httpIntegration({
      tracing: true,
    }),
    Sentry.nativeNodeFetchIntegration({
      tracing: true,
    }),
  ],
  sendDefaultPii: true,
  beforeSend(event) {
    console.log('📤 Sending event to Sentry:', event.type, event.transaction);
    return event;
  },
  beforeSendTransaction(event) {
    console.log('📈 Sending transaction to Sentry:', event.transaction);
    return event;
  },
});

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { wrapMcpServerWithSentry } from "@sentry/node";

// creates a fresh server instance per HTTP request (stateless)
function createServer() {
  const server = wrapMcpServerWithSentry(new McpServer(
    {
      name: "add-server",
      version: "1.0.0"
    },
    {
      // Explicitly advertise the tools capability so clients like Cursor
      capabilities: {
        tools: {}
      }
    }
  ));

  server.registerTool(
    "add",
    {
      title: "add",
      description: "Returns a + b",
      // Zod shape *not* wrapped in z.object(); SDK handles conversion.
      inputSchema: {
        a: z.number(),
        b: z.number()
      }
    },
    async ({ a, b }) => {
      // Make a weather API call (test call for children spans)
      await fetch('https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=London');
      
      return {
        content: [
          {
            type: "text", 
            text: `${a + b}`,
            mimeType: "text/plain"
          }
        ]
      };
    })

  return server;
}

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    // Undefined => stateless (one‑shot) session handling
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    transport.close();
    server.close?.();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      });
    }
  }
});

// Reject unsupported verbs (GET/DELETE, etc.)
const reject = (req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null
  });
};
app.get("/mcp", reject);
app.delete("/mcp", reject);


app.get("/sentry-error", async (req, res) => {
  console.log("Hello Hono!");
  throw new Error("My first Sentry error!");
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});
