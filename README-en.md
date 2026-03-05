# ComfyUI-MCP-Server - ComfyUI Model Context Protocol Integration

<p align="center">
   [<a href="./README.md">简体中文</a>] 
   [<a href="./README-en.md">ENGLISH</a>] 
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-success)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/Protocol-MCP-purple)](https://modelcontextprotocol.io/)
[![Static Badge](https://img.shields.io/badge/MetaBrainLabs-Org?logo=github&label=GitHub)](https://github.com/orgs/MetaBrain-Labs)

**ComfyUI-MCP-Server is an MCP (Model Context Protocol) based server implementation that seamlessly transforms ComfyUI workflows into tools that AI Agents can call.**

Through this project, you can empower AI assistants (such as `Claude Desktop`, `Trae`, `Dify`, etc.) with powerful image and video generation capabilities. Entirely through natural language interaction, the AI can achieve:

- 🎨 **Generate Images/Videos**
  - Call historical tasks or initial workflows to generate media content.
  - Proactively modify node parameters (within restricted/allowed ranges) to fine-tune generation results.
  - Automated batch generation: same workflow, different style presentations.
- 🔄 **Trigger and Reuse**
  - Trigger new workflows or reuse historically successful tasks with a single click.
- 🛠️ **Custom Execution**
  - Support execution of AI-customized JSON pipelines (Advanced Mode).

> [!WARNING]
> **Disclaimer**
>
> We currently **do not** have an official website. Any related websites you see online are unofficial and have no affiliation with this open-source project. Please assess the risks yourself.
>
> **Furthermore, we do not provide any paid services. Users should monitor their API TOKEN usage; the organization is not responsible for any incurred losses.**

> [!IMPORTANT]
> **Why Choose Us**
>
> For details, refer to [Why Choose Us](./docs/md/why-us.md)
>
> | Feature                         | ComfyUI MCP Server | Other Similar Projects                         |
> | ------------------------------- | ------------------ | ---------------------------------------------- |
> | Custom Parameter Exposure       | ✅ Supported       | ❌ Limited support or unsupported              |
> | No ComfyUI Modifications        | ✅ Fully supported | ❌ Typically requires modifications or plugins |
> | Natural Language Interaction    | ✅ Supported       | ❌ Usually requires API calls                  |
> | Real-time Progress Notification | ✅ Supported       | ❌ Limited support                             |
> | Multiple Transfer Methods       | ✅ STDIO + HTTP    | ❌ Usually supports only one                   |
> | Internationalization Support    | ✅ Built-in        | ❌ Usually English only                        |
> | Session Management              | ✅ Comprehensive   | ❌ Basic or none                               |

> [!NOTE]
> **Special Note**
>
> If you like this project or find it helpful, please give it a `Star ✨`.

## 🎬 Demo Video

Demo video file to be added...

## ✨ Core Features

- 🔌 **Workflows as Tools**: Perfectly abstracts ComfyUI node graphs into standard MCP tools.
- 🕰️ **Historical Task Reuse Mode**: A high-success-rate generation strategy that reuses known successful states.
- 🛡️ **Initial Workflow Validation**: Performs node connectivity pre-checks before generation.
- 🧩 **Standard MCP Adaptation**: Fully supports STDIO and Streamable HTTP communication.
- ⚡ **Streaming & Progress Support**: Supports generation progress reports (requires Client/Host support).
- 🌍 **Internationalization (i18n)**: Built-in bilingual support (English/Chinese).
- 🔬 **Skills Support**: Deeply optimized for AI assistants that support Skills.
- 📂 **Asset Management**: Automatically uploads resources from local paths or web URLs to ComfyUI.
- 🔄 **Automatic Session Management**: Intelligently handles the session lifecycle (currently targeted mainly at StreamHTTP).

## 🧰 Available Tools

AI Agents can call the following built-in tools via the MCP protocol:

| Tool Name               | Description                                                                                                                                                                                                                                                                                                         |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_core_manual`       | **[System Guide]** Core protocol and operation dictionary. Must be read before initializing or calling other tools to get the latest parameter filling strategies and error recovery mechanisms.                                                                                                                    |
| `get_workflows_catalog` | **[Catalog Retrieval]** Gets a list of all workflows currently supported by the server. Commands involving image generation must exactly match this list; forging or guessing workflow names is strictly prohibited.                                                                                                |
| `get_workflow_API`      | **[Workflow API]** Reads the full underlying topology JSON of the target workflow. Massive in size, call only when diagnosing abnormal executions to check the lowest-level logic. Strictly prohibited in normal business to prevent context pollution.                                                             |
| `mount_workflow`        | **[Parameter Mounting]** Extracts the supported interactive parameter Schema for the target generation task (hiding wiring details). Before submitting a workflow task, this interface must be called to get a table of valid parameter keys.                                                                       |
| `queue_prompt`          | **[Task Submission]** Submits a task Prompt to the queue. Automatically schedules compute nodes underneath and synchronizes progress to the Host in real-time. Ensure all keys have passed the mounting validation; forging keys is strictly prohibited.                                                            |
| `queue_custom_prompt`   | **[Advanced Mode]** Submits a complete native ComfyUI API Prompt JSON directly to the queue. Open only for debugging underlying solutions or responding to explicit expert commands; strictly prohibited for regular tasks.                                                                                         |
| `save_custom_workflow`  | **[Save Workflow]** Saves a custom parameterized workflow to the server's workflow directory and then automatically executes syntax validation and mounting. The submitted JSON must conform to the spec (containing at least one `==Name==` node that matches mounting rules), otherwise, saving will be rejected. |
| `save_task_assets`      | **[Save Generation Assets]** Gets the execution history of a specific task (`prompt_id`) and downloads/saves all generated multimedia assets (images, videos, GIFs, etc.) to a specified local directory.                                                                                                           |
| `upload_assets`         | **[Upload File]** Uploads local files or web URLs to the ComfyUI server's `input` directory so they can be applied directly in workflows.                                                                                                                                                                           |
| `interrupt_prompt`      | **[Task Cancellation]** Cancels the computation process of a specific `prompt_id` and forcefully removes waiting items from the queue.                                                                                                                                                                              |
| `get_prompt_result`     | **[Output Snapshot & Assets]** Gets the node snapshot after a specific Prompt finishes executing, extracts the generated target media files (image/video links), or backtracks Tracebacks to diagnose errors.                                                                                                       |
| `get_system_status`     | **[System Monitoring]** Collects memory, VRAM, and Python runtime metrics to troubleshoot underlying exceptions like OOM or service deadlocks.                                                                                                                                                                      |
| `list_models`           | **[Model Directory]** Polls the local disk model storage area. When parameters involve specific model files, this interface must be called beforehand to enumerate and calibrate; forging model filenames out of thin air is strictly prohibited.                                                                   |

_(Note: The `upload_assets` tool handles both local file paths and network links for importing images into the ComfyUI server)._

## 🚀 Quick Start

> [!TIP]
> **Tip**
>
> The MCP protocol currently defines two standard transport mechanisms for client-server communication:
>
> - STDIO
> - Streamable HTTP
>
> This project supports both. Please choose based on the capabilities of your MCP client.
>
> You are responsible for ensuring that the use of these servers complies with relevant terms, as well as any laws, rules, regulations, policies, or standards applicable to you.

### Prerequisites

- Node.js 18+
- ComfyUI running

### Mode 1: STDIO Connection (Recommended for local clients like Claude Desktop)

- Clone the repository
- Install dependencies
  ```bash
  npm install
  ```
- Configure environment variables:
  - You only need to configure the following JSON in your MCP Client/Host.
  - Global variables for STDIO need to be manually configured in the `mcpServers` section below.
  ```json
  {
    "mcpServers": {
      "comfy-ui-advanced": {
        "command": "npx",
        "args": [
          "tsx",
          "E:\\comfyui-mcp\\ComfyUI-MCP-Server-1\\src\\server-stdio.ts"
        ],
        "env": {
          "LOCALE": "en",
          "MCP_SERVER_URL": "http://192.168.0.192:8189/mcp",
          "MCP_SERVER_IP": "http://192.168.0.192",
          "MCP_SERVER_PORT": "8189",
          "COMFY_UI_SERVER_IP": "http://192.168.0.171:8188",
          "COMFY_UI_SERVER_HOST": "192.168.0.171",
          "COMFY_UI_SERVER_PORT": "8188",
          "SYNC_MODE": "timed",
          "SYNC_POLL_INTERVAL_SECONDS": "3",
          "SYNC_EVENT_FALLBACK_INTERVAL_SECONDS": "300",
          "ONDEMAND_REFRESH_COOLDOWN_SECONDS": "3",
          "COMFY_UI_INSTALL_PATH": "",
          "WORKFLOW_NAME_REGEX": "^==(.+?)==$",
          "WORKFLOW_PARAM_REGEX": "^=>(.+)$",
          "LOG_LEVEL": "INFO"
        }
      }
    }
  }
  ```

### Mode 2: StreamHTTP Connection (Recommended for networked/distributed deployment)

- Clone the repository
- Install dependencies
  ```bash
  npm install
  ```
- Configure environment variables:
  - Global variables for StreamHTTP are specified in the `[.env](./env)` file; there is no need to configure them in `mcpServers` below.
  - Currently, few MCP Clients/Hosts support StreamHTTP, so use it based on your needs.
  ```json
  {
    "mcpServers": {
      "comfy-ui-advanced-http": {
        "url": "http://192.168.0.192:8189/mcp"
      }
    }
  }
  ```
- Start the server using the StreamHTTP connection method:
  ```bash
  npm run dev
  ```

### Debugging Tool (MCP Inspector)

The Inspector is an official MCP debugging tool provided by MCP. It is recommended to use StreamHTTP as the connection method for the Inspector.

- Clone the repository
- Install relevant dependencies
  ```bash
  npm install
  ```
- Start the server using the StreamHTTP connection method:
  ```bash
  # 1. Start the HTTP service in Terminal A
  npm run dev
  ```
- Start the Inspector:
  ```bash
  # 2. Start the Inspector in Terminal B
  npm run inspector
  ```

Once started, an address similar to the one below will appear in the console. Copy the address to your browser to start debugging the related tools:

```bash
# The MCP_PROXY_AUTH_TOKEN is different every time it starts, so you need to switch the link promptly after each startup.
http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=d66fcf6cbbb3723c60bfef51f020e5e96811002a675e7162b065b44f2fe377f3
```

After the inspector is successfully started, refer to the following image for browser page configuration:

![Inspector configuration example](./docs/content/public/inspector-example.png)

## ⚙️ Environment Configuration

> [!TIP]
> **Note**
>
> Below are all the environment configuration parameters for this server and their descriptions. Please read this first.
>
> Some of the environmental configuration parameters below are not yet enabled; those not yet enabled are planned for future use.

<details open>
<summary>Click to view full configuration file instructions</summary>

```
# =============================================================================
# ComfyUI MCP Server - Configuration
# File instructions:
#   [User Config]   User Configuration —— Modify this section based on your deployment environment
#   [System Config] System Configuration —— Keep defaults, no modification needed
# =============================================================================

# =============================================================================
# [User Config]
# Modify this section based on your deployment environment.
# =============================================================================

# Language for MCP tool descriptions. Supported values: en | zh
LOCALE=en

# -----------------------------------------------------------------------------
# ComfyUI Server Connection
# -----------------------------------------------------------------------------

# Full URL of your ComfyUI server. No trailing slash.
COMFY_UI_SERVER_IP="http://192.168.0.171:8188"

# Host (without protocol) and port. Used separately for WebSocket connections.
COMFY_UI_SERVER_HOST="192.168.0.171"
COMFY_UI_SERVER_PORT="8188"

# -----------------------------------------------------------------------------
# Sync Mode
# -----------------------------------------------------------------------------

# Controls how the server detects workflow updates from ComfyUI.
#
#   timed  — Background loop polls ComfyUI at a fixed interval. (default)
#
#   push   — ComfyUI plugin sends real-time save events; long fallback poll as safety net.
#             Requires COMFY_UI_INSTALL_PATH (must be on same machine as ComfyUI).
#
#   manual — No background loop. Refresh only when tools are called
#             (get_workflows_catalog / mount_workflow / queue_prompt).
#
SYNC_MODE=timed

# Polling interval in seconds for timed mode.
SYNC_POLL_INTERVAL_SECONDS=3

# Fallback polling interval in seconds for push mode (safety net for missed events).
SYNC_EVENT_FALLBACK_INTERVAL_SECONDS=300

# Cooldown in seconds between manual mode refreshes.
# Prevents excessive ComfyUI API calls when tools are called in quick succession.
ONDEMAND_REFRESH_COOLDOWN_SECONDS=30

# -----------------------------------------------------------------------------
# Push Mode Plugin (Required only when SYNC_MODE=push)
# -----------------------------------------------------------------------------

# Absolute path to your LOCAL ComfyUI installation root directory.
# Required when SYNC_MODE=push: MCP Server will automatically deploy a lightweight
# backend plugin that pushes workflow save events in real-time.
# Leave blank if ComfyUI runs on a remote machine or if using timed/manual mode.
#
# Windows Example: COMFY_UI_INSTALL_PATH=C:/ComfyUI
# Linux   Example: COMFY_UI_INSTALL_PATH=/home/user/ComfyUI
COMFY_UI_INSTALL_PATH=

# -----------------------------------------------------------------------------
# Workflow Marker Patterns
# -----------------------------------------------------------------------------

# Regex identifying the workflow name node (title of a PrimitiveStringMultiline node).
# Must contain ONE capture group that extracts the MCP tool name.
# Default matches titles like "==my_workflow=="
WORKFLOW_NAME_REGEX=^==(.+?)==$

# Regex identifying configurable parameter nodes.
# Must contain ONE capture group that extracts the parameter description.
# Default matches titles like "=>prompt text"
WORKFLOW_PARAM_REGEX=^=>(.+)$

# =============================================================================
# [System Config]
# Internal settings — change only if you know what you are doing.
# =============================================================================

# -----------------------------------------------------------------------------
# MCP Server Address
# -----------------------------------------------------------------------------

# MCP server bind address and listening port (where the MCP client connects).
MCP_SERVER_URL="http://192.168.0.192:8189/mcp"
MCP_SERVER_IP="http://192.168.0.192"
MCP_SERVER_PORT="8189"

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------

# Minimum log level written to stderr.
# DEBUG | INFO | WARNING | ERROR  (default: INFO)
LOG_LEVEL=INFO

# Optional absolute path for a log file.
# When set, logs are written to BOTH stderr and this file.
# Leave blank to disable file logging.
# LOG_FILE=

# Log file rotation size. Default: 10 MB
# LOG_ROTATE=10 MB

# Number of rotated log files to retain. Default: 7
# LOG_RETAIN=7
```

</details>

## Examples

### Claude Desktop

To be added...

### Trae

To be added...

## 🛠️ Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure ComfyUI is running.
   - Check ComfyUI's WebSocket port configuration.
   - Check if `COMFY_UI_SERVER_HOST` and `PORT` in `.env` are configured correctly.
2. **Workflow Execution Failed**
   - Check if the submitted parameter types match the target node's requirements (Schema).
   - Check the ComfyUI console for errors indicating missing Custom Nodes.
   - Check the corresponding MCP Server logs in your MCP Client/Host for detailed error messages.
3. **Session Expired**
   - The default HTTP session timeout is 30 minutes. If rendering ultra-long videos, you can extend it by modifying the `SESSION_TIMEOUT` constant in the code.

## 🔬 Technical Details

### Core Protocols

1. **MCP (Model Context Protocol)**

   [What is the Model Context Protocol (MCP)? - Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)

2. **JSON-RPC 2.0**

   [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

3. **WebSocket**

   [The WebSocket API (WebSockets) - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

4. **REST API**

   [About the REST API - GitHub Docs](https://docs.github.com/en/rest/about-the-rest-api/about-the-rest-api?apiVersion=2022-11-28)

### Technical Limitations & Security Considerations

- **Dependencies**: Strongly relies on ComfyUI's native API and WebSockets. Does not support non-ComfyUI standard graph imports.
- **Security Validation**: The current version does not implement a strong authentication mechanism (Token/Auth). Please **DO NOT** expose it to run on public networks. It is recommended to configure HTTPS and an additional gateway-level access control in production environments.
- **Resource Consumption**: High concurrency calls may lead to VRAM exhaustion (OOM) on the ComfyUI host machine. Please limit concurrency request frequency in your AI system's system prompts.

### **Image Generation Modes**

- **Generate via Historical Tasks:** Generates images based on historical tasks that **have completed execution with a SUCCESS result**.
  - This method ensures the success rate of the workflow execution, given that core components like models are unaffected.
- **Generate via Initial Workflows:** Generates images based on workflows that **have no historical tasks or whose historical task execution time is earlier than the workflow's latest modification time**.
  - This method only performs preliminary validation on the workflow—ensuring node connectivity is normal—but does not guarantee the entire workflow will run successfully.
  - If you need to ensure the success rate, consider running the related workflow manually first. Once the workflow runs successfully, a corresponding task record will be generated in history, allowing the AI tool to use the "Historical Task" generation method subsequently.
- **AI Tool Custom Generation (Fallback):** The AI tool **provides an API JSON file itself** and calls the custom workflow execution tool to generate images.
  - This method skips all validations here; everything is handed over to the ComfyUI backend. If there are issues with the API JSON format, nodes, or parameter ranges, the ComfyUI backend will intercept it and return the corresponding error message.
  - This is a fallback generation measure used only when the historical task and initial workflow methods fail. Otherwise, users should avoid using this method.

Built for developers who want to connect AI tools with ComfyUI's powerful image/video generation workflows, covering everything from simple natural language queries to complex multi-step agent workflows.

## 🗺️ Roadmap

> [!TIP]
> **Note**
>
> We are actively expanding project features. If you have good suggestions, feel free to submit an Issue!

- [ ] **Enhanced Workflow Parsing**: Support for more complex nested nodes and dynamic parameter extraction.
- [ ] **Cloud Service Integration**: Adapt to mainstream ComfyUI cloud hosting platforms (Authentication and API mapping).
- [ ] **Connection Optimization**: Improve disconnection/reconnection mechanisms and state retention under StreamHTTP.
- [ ] **Performance Dashboard**: Add visual feedback for resource usage and task queue monitoring.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Contribution Guidelines

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is open-sourced under the **MIT** License - see the [LICENSE](./LICENSE) file for details.

_This project is driven by third-party community open-source contributors and is not an official ComfyUI product. Incubated and contributed by [MetaBrain-Labs](https://github.com/MetaBrain-Labs)._

## 📬 Contact

_(Note: Due to work schedules, emails may not be replied to immediately. Please prioritize using GitHub Issues)._

### Issue/Requirement Submission

[MetaBrain-Labs(metabrain0302@163.com)](mailto:metabrain0302@163.com)

### Contributor

`TypeScript` Version Author:

[LaiFQZzr (lfq2376939781@gmail.com)](mailto:lfq2376939781@gmail.com)

[![Static Badge](https://img.shields.io/badge/LaiFQZzr-User?logo=github&label=GitHub)](https://github.com/LaiFQzzr)

`Python` Version Author:

[OldDeer (q1498823915@outlook.com)](mailto:q1498823915@outlook.com)

[![Static Badge](https://img.shields.io/badge/OldDeer-User?logo=github&label=GitHub)](https://github.com/OldDeer00)
