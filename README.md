# MCP Express Server

A Node.js Express server that implements the Model Context Protocol (MCP) with integrated Sentry monitoring and performance tracking.

## Features

- **MCP Integration**: Implements MCP server with tool capabilities
- **Sentry Monitoring**: Full error tracking and performance monitoring
- **RESTful API**: Express.js server with JSON API endpoints
- **Tool System**: Built-in "add" tool for mathematical operations
- **Stateless Design**: Fresh server instances per request
- **ES Modules**: Modern JavaScript module system

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd express-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
export NODE_ENV=development  # or production
```

## Usage

### Starting the Server
1. setup your sentry DSN
2. run `node mcp-express.js`

The server will start on port 3005 by default.

## API Endpoints

### MCP Endpoint

**POST** `/mcp`

Main MCP protocol endpoint for tool interactions.

Example request:
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

### Test Endpoints

**GET** `/sentry-error`

Triggers a test error for Sentry monitoring verification.

## Available Tools

### Add Tool

- **Name**: `add`
- **Description**: Returns the sum of two numbers
- **Parameters**:
  - `a` (number): First number
  - `b` (number): Second number
- **Returns**: Sum of a + b

## Configuration

### Sentry Configuration

The server is configured with:
- **DSN**: Pre-configured for error tracking
- **Tracing**: 100% sample rate for development
- **Spotlight**: Enabled for local development
- **Performance Monitoring**: Full HTTP request/response tracking

### MCP Configuration

- **Server Name**: "add-server"
- **Version**: "1.0.0"
- **Capabilities**: Tools support
- **Transport**: Streamable HTTP Server Transport

## Development

### Project Structure 