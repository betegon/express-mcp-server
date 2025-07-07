// MCP Server with Sentry instrumentation
// Run with: node --import ./instrument.mjs mcp-express.mjs
//           and comment out the import of the instrument.mjs file
import "./instrument.mjs"; 
import * as Sentry from "@sentry/core";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// ===== Constants =====
const PORT = process.env.PORT || 3005;
const SERVER_CONFIG = {
  name: "add-server",
  version: "1.0.0"
};

const CAPABILITIES = {
  tools: { listChanged: true },
  resources: { listChanged: true },
  prompts: { listChanged: true },
  logging: {}
};

const ERROR_CODES = {
  INTERNAL: -32603,
  METHOD_NOT_ALLOWED: -32000
};

// ===== Global State =====
const resources = new Map();
let toolCounter = 0;

// ===== Helper Functions =====
function createErrorResponse(code, message, id = null) {
  return {
    jsonrpc: "2.0",
    error: { code, message },
    id
  };
}

async function logMessage(server, level, message, logger = "system") {
  await server.server.sendLoggingMessage({
    level,
    data: message,
    logger
  });
}

// ===== Resource Management =====
function initializeStaticResources() {
  const staticResourceUri = "memory://test-config";
  resources.set(staticResourceUri, {
    name: "test-config",
    content: JSON.stringify({
      version: "1.0.0",
      environment: "test",
      features: {
        logging: true,
        notifications: true,
        instrumentation: true
      },
      timestamp: new Date().toISOString()
    }, null, 2),
    mimeType: "application/json",
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

async function getResourceContent(uri) {
  const resource = resources.get(uri.toString());
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    contents: [{
      uri: uri.toString(),
      mimeType: resource.mimeType,
      text: resource.content
    }]
  };
}

// ===== Tool Handlers =====
const toolHandlers = {
  // Basic math tool with progress notifications
  async add(server, { a, b }) {
    await logMessage(server, "info", `Starting addition: ${a} + ${b}`, "math-service");

    // Simulate progress for demonstration
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await logMessage(server, "debug", `Addition progress: ${i}/${steps}`, "math-service");
    }
    
    const result = a + b;
    await logMessage(server, "info", `Addition completed: ${a} + ${b} = ${result}`, "math-service");

    return {
      content: [{
        type: "text", 
        text: `${result}`,
        mimeType: "text/plain"
      }]
    };
  },

  // Dynamic tool creation
  async addDynamicTool(server, { name, description }) {
    const toolName = `dynamic-${name}-${++toolCounter}`;
    
    server.tool(
      toolName,
      description || `Dynamic tool: ${name}`,
      { input: z.string() },
      async ({ input }) => ({
        content: [{
          type: "text",
          text: `Dynamic tool ${toolName} processed: ${input}`,
          mimeType: "text/plain"
        }]
      })
    );

    server.sendToolListChanged();
    await logMessage(server, "info", `Added dynamic tool: ${toolName}`, "tool-manager");

    return {
      content: [{
        type: "text",
        text: `Created dynamic tool: ${toolName}`,
        mimeType: "text/plain"
      }]
    };
  },

  // Resource creation
  async createResource(server, { name, content, mimeType }) {
    const resourceUri = `memory://${name}`;
    
    resources.set(resourceUri, {
      name,
      content,
      mimeType: mimeType || "text/plain",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    server.resource(
      name,
      resourceUri,
      {
        description: `Dynamic resource: ${name}`,
        mimeType: mimeType || "text/plain"
      },
      getResourceContent
    );

    server.sendResourceListChanged();
    await logMessage(server, "info", `Created resource: ${resourceUri}`, "resource-manager");

    return {
      content: [{
        type: "text",
        text: `Created resource: ${resourceUri}`,
        mimeType: "text/plain"
      }]
    };
  },

  // Resource update
  async updateResource(server, { name, content }) {
    const resourceUri = `memory://${name}`;
    const resource = resources.get(resourceUri);
    
    if (!resource) {
      throw new Error(`Resource not found: ${name}`);
    }

    resource.content = content;
    resource.updatedAt = new Date();
    
    await server.server.sendResourceUpdated({ uri: resourceUri });
    await logMessage(server, "info", `Updated resource: ${resourceUri}`, "resource-manager");

    return {
      content: [{
        type: "text",
        text: `Updated resource: ${resourceUri}`,
        mimeType: "text/plain"
      }]
    };
  },

  // Custom logging
  async logMessage(server, { level, message, logger }) {
    await logMessage(server, level, message, logger || "custom-logger");

    return {
      content: [{
        type: "text",
        text: `Sent ${level} log message: ${message}`,
        mimeType: "text/plain"
      }]
    };
  },

  // Dynamic prompt creation
  async addDynamicPrompt(server, { name, description }) {
    const promptName = `dynamic-${name}`;
    
    server.prompt(
      promptName,
      description || `Dynamic prompt: ${name}`,
      { topic: z.string() },
      async ({ topic }) => ({
        description: `Dynamic prompt ${promptName} for topic: ${topic}`,
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `This is a dynamic prompt about: ${topic}`
          }
        }]
      })
    );

    await logMessage(server, "info", `Added dynamic prompt: ${promptName}`, "prompt-manager");

    return {
      content: [{
        type: "text",
        text: `Created dynamic prompt: ${promptName}`,
        mimeType: "text/plain"
      }]
    };
  }
};

// ===== Server Creation =====
function createServer() {
  const server = Sentry.wrapMcpServerWithSentry(
    new McpServer(SERVER_CONFIG, { capabilities: CAPABILITIES })
  );

  // Register static resource
  server.resource(
    "test-config",
    "memory://test-config",
    {
      description: "Static test configuration resource for instrumentation testing",
      mimeType: "application/json"
    },
    getResourceContent
  );

  // Register tools
  server.tool(
    "add",
    "Returns a + b",
    { a: z.number(), b: z.number() },
    (params) => toolHandlers.add(server, params)
  );

  server.tool(
    "add-dynamic-tool",
    "Adds a new dynamic tool and notifies clients",
    { name: z.string(), description: z.string().optional() },
    (params) => toolHandlers.addDynamicTool(server, params)
  );

  server.tool(
    "create-resource",
    "Creates a new resource and notifies clients",
    { name: z.string(), content: z.string(), mimeType: z.string().optional() },
    (params) => toolHandlers.createResource(server, params)
  );

  server.tool(
    "update-resource",
    "Updates an existing resource and notifies clients",
    { name: z.string(), content: z.string() },
    (params) => toolHandlers.updateResource(server, params)
  );

  server.tool(
    "log-message",
    "Sends a custom log message to the client",
    {
      level: z.enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]),
      message: z.string(),
      logger: z.string().optional()
    },
    (params) => toolHandlers.logMessage(server, params)
  );

  server.tool(
    "add-dynamic-prompt",
    "Adds a new dynamic prompt and notifies clients",
    { name: z.string(), description: z.string().optional() },
    (params) => toolHandlers.addDynamicPrompt(server, params)
  );

  // Register default prompt
  server.prompt(
    "math-explanation",
    "Explains a mathematical concept",
    { concept: z.string() },
    async ({ concept }) => ({
      description: `Mathematical explanation for: ${concept}`,
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please explain the mathematical concept: ${concept}`
        }
      }]
    })
  );

  return server;
}

// ===== Express Routes =====
async function handleMcpRequest(req, res, isSSE = false) {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined // Stateless mode
  });

  res.on("close", () => {
    transport.close();
    server.close?.();
  });

  try {
    await server.connect(transport);
    if (isSSE) {
      await transport.handleRequest(req, res);
    } else {
      await transport.handleRequest(req, res, req.body);
    }
  } catch (err) {
    console.error("MCP error:", err);
    if (!res.headersSent) {
      res.status(500).json(
        createErrorResponse(ERROR_CODES.INTERNAL, "Internal server error")
      );
    }
  }
}

// ===== Express App Setup =====
const app = express();
app.use(express.json());

// POST endpoint for JSON-RPC requests
app.post("/mcp", (req, res) => handleMcpRequest(req, res));

// GET endpoint for SSE connections
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  
  if (!sessionId) {
    return res.status(400).json(
      createErrorResponse(
        ERROR_CODES.METHOD_NOT_ALLOWED,
        "Bad Request: mcp-session-id header required for SSE stream"
      )
    );
  }

  await handleMcpRequest(req, res, true);
});

// Reject unsupported HTTP methods
app.delete("/mcp", (req, res) => {
  res.status(405).json(
    createErrorResponse(ERROR_CODES.METHOD_NOT_ALLOWED, "Method not allowed.")
  );
});

// Test endpoint for Sentry error tracking
app.get("/sentry-error", async (req, res) => {
  console.log("Hello Express!");
  throw new Error("My first Sentry error!");
});

// ===== Server Startup =====
initializeStaticResources();

app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
  console.log("\nAvailable tools for notification testing:");
  console.log("- add: Basic math with progress logging");
  console.log("- add-dynamic-tool: Create new tools dynamically");
  console.log("- create-resource: Create new resources");
  console.log("- update-resource: Update existing resources"); 
  console.log("- log-message: Send custom log messages");
  console.log("- add-dynamic-prompt: Create new prompts dynamically");
});
