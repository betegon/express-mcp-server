// to add the instrumentation, we need to import the instrument.mjs file when running the server:
// node --import ./instrument.mjs mcp-express-sse.mjs

import "./instrument.mjs";
import * as Sentry from "@sentry/core";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const getServer = () => {
  const server = Sentry.wrapMcpServerWithSentry(new McpServer({
    name: "sse-add-server",
    version: "1.0.0"
  }, {
    capabilities: {}
  }));

  server.tool(
    "add",
    "Returns a + b",
    {
      a: z.number(),
      b: z.number()
    },
    async ({ a, b }) => {
      const result = a + b;
      return {
        content: [
          {
            type: "text",
            text: `${result}`,
            mimeType: "text/plain"
          }
        ]
      };
    }
  );

  return server;
};

const app = express();
app.use(express.json());

const transports = {};

// SSE endpoint
app.get("/mcp", async (req, res) => {
  try {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;

    transport.onclose = () => {
      delete transports[sessionId];
    };

    const server = getServer();
    await server.connect(transport);
  } catch (error) {
    console.error("SSE error:", error);
    if (!res.headersSent) {
      res.status(500).send("Error establishing SSE stream");
    }
  }
});

// Messages endpoint
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  
  if (!sessionId) {
    return res.status(400).send("Missing sessionId parameter");
  }

  const transport = transports[sessionId];
  if (!transport) {
    return res.status(404).send("Session not found");
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error("Message error:", error);
    if (!res.headersSent) {
      res.status(500).send("Error handling request");
    }
  }
});

const PORT = 3006;
app.listen(PORT, () => {
  console.log(`SSE MCP server listening on port ${PORT}`);
}); 