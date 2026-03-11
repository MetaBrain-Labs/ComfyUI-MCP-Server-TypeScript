# ComfyUI MCP Server

## Operational Guide — Workflow Catalog Construction Method

**This is the default method. When users submit requests without explicitly specifying another approach, this method is used to produce images/videos.**

### Step 1: Retrieve Workflow Catalog

Before executing any generation task, obtain the list of all workflows currently supported by the server.

```
get_workflows_catalog()
```

Expected Output: A JSON array containing `name` (workflow identifier), `description`, and other metadata fields.

> **STRICTLY PROHIBITED**: Never use workflow names based on memory or guesswork. Target workflows must be precisely matched from this catalog.

### Step 2: Mount Workflow — Retrieve Parameter Structure

After matching the target workflow from the catalog, call the mount interface to obtain a valid parameter key mapping.

```
mount_workflow()
```

Important Notes:

1. `workflowName` can be customized but must match the regular expression `/^[a-zA-Z0-9_-]+$/`.
2. `promptId` must be an `id` from the list obtained via the `get_workflows_catalog()` method.
3. `workflowName` cannot contain Chinese characters.

Expected Output: A JSON object describing configurable parameters, where each parameter includes `parameter` (key name), `default_value`, and `enum_values` (if applicable).

> All parameter keys must be derived entirely from this response. **Do not** fabricate or guess key names.

### Step 3: Submit the Task

Map the user request into parameter key-value pairs and submit the workflow task.

```
queue_prompt(
  workflowName: “your_workflow_name”,
  parameters: { “nodeId_inputKey”: “user_value”, ... },
  isAsync: false   // false = wait for result; true = return prompt ID immediately (for batch tasks)

```

Expected Output (Synchronous): A task execution snapshot containing the output node media file URL (image, video, etc.).

Expected Output (Asynchronous): `{ “prompt_id”: “...” }` — Use `get_prompt_result` to query the result later.

## Optional Actions After Workflow Execution

### Step 1 (Optional): Query Asynchronous Task Results

After asynchronous submission, retrieve completed results using the promptId.

```
get_prompt_result(promptId: “the_prompt_id_from_step_4”)
```

Expected Output: Complete task history snapshot containing accessible URLs for all generated media files.

### Step 2 (Optional): Save Generated Assets

Download and save generated images, videos, or other files to a local directory.

```
save_task_assets(
  promptId: “the_task_prompt_id”,
  destinationDir: “/path/to/save”   // (Saves to project assets/ folder by default if omitted)

```

Expected Output: A list of local file paths for all saved resources.

## Additional Tool References

| Tool                             | Purpose                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `upload_assets(fileSource)`      | Uploads local files or HTTP URLs to ComfyUI input directory for workflow use |
| `interrupt_prompt(promptId)`     | Cancels running or queued tasks                                              |
| `list_models(typeName)`          | Lists available model files (checkpoints/LORAs/VAE/ControlNet)               |
| `get_system_status()`            | Retrieves ComfyUI runtime metrics: CPU, GPU, memory, and queue status        |
| `get_workflow_API(workflowName)` | Reads raw workflow topology JSON (for deep debugging only)                   |

## Key Restrictions

1. **Directory Priority**: Workflow names must exactly match `get_workflows_catalog` returns. Fictitious names are strictly prohibited.
2. **Mount Before Submission**: Always call `mount_workflow` before submission. All parameter keys must originate from mount results.
3. **Model Validation**: When tasks require specific models, always call `list_models` first to obtain a list of valid filenames. Fictitious model paths are strictly prohibited.
4. **Error Handling**: When ComfyUI returns execution errors, diagnose and correct issues based on node error logs. Do not blindly retry.
