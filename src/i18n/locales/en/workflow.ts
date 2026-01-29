export default {
  promptId: "The unique ID for a single 'workflow execution task'",

  collected: (offset: number, count: number, mode: string) =>
    `Collected and saved ${count} workflows from offset ${offset}, mode: ${mode ? "append" : "overwrite"}`,
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
