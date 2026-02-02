import { COMMON } from "../../../constants";

export default {
  instructions: `
    ComfyUI MCP Server - AI Image Generation Workflows

    📚 IMPORTANT - Read Skills First:
    This server provides skills (best practice guides) as resources.
    Before using any tool, please read the relevant skill resource to understand:
    - Recommended workflows
    - Common patterns
    - Error handling
    - Best practices

    Available Skills:
    - skill://comfyui-workflow-agent - Main workflow orchestration guide

    Recommended Usage Pattern:
    1. User requests image generation
    2. Read skill://comfyui-workflow-agent
    3. Follow the Discovery-Mount-Execute pattern from the skill
    4. Use tools according to skill guidelines
  `,

  promptId: "The unique ID for a single 'workflow execution task'",

  collected: (offset: number, count: number, mode: string) =>
    `Collected and saved ${count} workflows from offset ${offset}, mode: ${mode ? "append" : "overwrite"}
      IMPORTANT:
        To read the contents of this file, first verify whether the MCP resource channel is available. Do not attempt to read the disk path directly.
        Please read the resource URI: ${COMMON.WORKFLOW_RESOURCE_URI}
        If MCP cannot be used for reading, use the 'cui_get_workflow_tasks' tool to obtain the corresponding resource information.
    `,
  collectedContent: {
    title: "Query ComfyUI workflow history tasks",
    description:
      "Fetch workflow history tasks from ComfyUI. You can configure the number of items to retrieve and the offset as needed",
    maxItems:
      "Maximum number of history tasks to retrieve in a single request. Recommended values: 2-3 for small batches, 10 for complete retrieval",
    offset:
      "Pagination offset, starting from 0. For example: offset = 0 retrieves the first N items, offset = N retrieves the next N items",
    append:
      "Storage mode. true = append to existing data (accumulate), false = overwrite existing data (reset)",
  },

  executeWorkflowOriginalTask: {
    title: "cui_execute_workflow_original_task",
    description:
      "RESTRICTED. Use ONLY for explicit low-level debug or raw API generation. PROHIBITED for standard tasks.",
  },
};
