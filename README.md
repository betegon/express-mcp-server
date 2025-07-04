# Express MCP Auto-Instrumentation Examples

This repository contains three example implementations of MCP (Model Context Protocol) servers using Express.js, demonstrating different approaches to Sentry instrumentation and transport mechanisms.

## Overview

The project showcases how to integrate Sentry monitoring and performance tracking with MCP servers, providing examples with full instrumentation, partial instrumentation, and SSE transport.



## Installation

```bash
# Clone the repository
git clone <repository-url>
cd express-mcp-auto-instrumentation

# Install dependencies
yarn install
```

## The Three Servers

### 1. Streamable HTTP Server with Full Instrumentation
**File:** `mcp-express-streamable-http.mjs`  
**Port:** 3005

This is the most feature-rich implementation with complete Sentry instrumentation.

**Features:**
- Full Sentry error tracking and performance monitoring via `wrapMcpServerWithSentry`
- Supports both POST (JSON-RPC) and GET (SSE) endpoints
- Stateless design (fresh server instance per request)
- Advanced tools:
  - `add` - Basic math with progress notifications
  - `add-dynamic-tool` - Create new tools on the fly
  - `create-resource` - Create new resources dynamically
  - `update-resource` - Update existing resources
  - `log-message` - Send custom log messages
  - `add-dynamic-prompt` - Create prompts dynamically
- Resources and prompts support
- Comprehensive logging system

**Run:**
```bash
node mcp-express-streamable-http.mjs
```

### 2. SSE Server with Instrumentation
**File:** `mcp-express-sse.mjs`  
**Port:** 3006

A simpler implementation using Server-Sent Events (SSE) transport with Sentry instrumentation.

**Features:**
- Full Sentry instrumentation via `wrapMcpServerWithSentry`
- SSE-based transport exclusively
- Session management (maintains state between requests)
- Basic `add` tool for mathematical operations
- Separate endpoints for SSE stream (`/mcp`) and messages (`/messages`)

**Run:**
```bash
node mcp-express-sse.mjs
```

### 3. Streamable HTTP Server without Wrapper Instrumentation
**File:** `mcp-express-no-instrumentation.js`  
**Port:** 3005

A minimal implementation that imports Sentry but doesn't use the MCP-specific wrapper.

**Features:**
- Imports Sentry instrumentation but doesn't wrap the MCP server
- Uses older `registerTool` API
- Stateless design
- Basic `add` tool that includes a weather API call (for testing child spans)
- Demonstrates baseline MCP functionality

**Run:**
```bash
node mcp-express-no-instrumentation.js
```

## API Usage

### Basic Tool Call Example

**POST** `/mcp`

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "add",
    "arguments": {
      "a": 5,
      "b": 3
    }
  },
  "id": 1
}
```

### SSE Connection (Server 2 only)

**GET** `/mcp` - Establishes SSE stream  
**POST** `/messages?sessionId={sessionId}` - Send messages to established session

### Test Sentry Integration

All servers include a test endpoint:

**GET** `/sentry-error` - Triggers a test error for Sentry verification

## Key Differences

| Feature | Streamable HTTP (Full) | SSE Server | No Wrapper |
|---------|----------------------|------------|------------|
| Sentry Wrapper | ✅ `wrapMcpServerWithSentry` | ✅ `wrapMcpServerWithSentry` | ❌ Basic import only |
| Transport | StreamableHTTP | SSE | StreamableHTTP |
| Tools | 6 advanced tools | 1 basic tool | 1 basic tool |
| Resources | ✅ | ❌ | ❌ |
| Prompts | ✅ | ❌ | ❌ |
| State | Stateless | Stateful | Stateless |
| API Style | Modern `tool()` | Modern `tool()` | Legacy `registerTool()` |

## Development Notes

- The `instrument.mjs` file must be imported using Node's `--import` flag for proper Sentry initialization
- All servers demonstrate different aspects of MCP server implementation
- The full instrumentation server (streamable-http) serves as the most comprehensive example
- SSE server shows how to maintain session state across requests
- The no-wrapper server demonstrates baseline functionality without MCP-specific Sentry features

## License

[Add your license here] 