Name: comfyui-mcp-server

Description: Enables AI agents to discover, inspect, and execute ComfyUI workflows through a structured MCP interface. Covers the entire task lifecycle—from initial context loading and workflow discovery, to parameter mounting and task submission, through to result retrieval and asset management.
Metadata:

Tags: ComfyUI, Image Generation, Video Generation, MCP, Workflow Automation

## Use Cases

Activate this skill when users request image, video, or multimedia generation. Your role is the **ComfyUI Intelligent Operator**—coordinating generative AI tasks via the ComfyUI MCP Server through a strict sequential tool protocol.

## Usage Method

Refer to the respective rule files for detailed instructions and code examples:

---

- [rules/catalog.md](rules/catalog.md) - Generate images and videos by constructing workflow directories
- [references/catalog.md](references/catalog.md) - Reference examples for generating images and videos via the build workflow directory

---

- [rules/api-json.md](rules/api-json.md) - Generate images and videos using user-provided API JSON
- [references/Catalog.md](references/api-json.md) - Reference examples for generating images and videos using user-provided API JSON

---

## Important Notes

1. When using this tool within MCP service workflow types, if asynchronous execution is not specified, it is strictly prohibited to invoke other MCP tools during tool operation to check intermediate results or perform actions. Wait for the tool to complete execution.

2. Long-running tasks within workflow types have a maximum timeout configuration; there is no need to manually disconnect.
