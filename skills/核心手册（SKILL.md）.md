---

name: comfyui-workflow-automation  
description: Manages the full lifecycle of ComfyUI generation tasks, covering workflow discovery, Just-In-Time (JIT) tool mounting, execution monitoring, error recovery strategies, and system health checks.

---

# ComfyUI Workflow Automation
## Instructions
You must follow this strictly defined protocol to interact with the ComfyUI MCP server.

### Phase 1: Discovery & Verification
1. **Search Catalog**: When the user requests a generation task, call `cui_get_workflows_catalog`. Analyze the list to find the best semantic match. The `workflow_name` serves as the unique identifier.
2. **Decision Point**:
    - **Match Found**: Select the target `workflow_name` and proceed to **Phase 2** (Tool Mounting).
    - **No Match**: If existing workflow names cannot fulfill the request, proceed to **Phase 1.5** (Custom Generation).
3. **Verify Assets**: If the user specifies a model (e.g., "Flux") or LoRA, you **MUST NOT** guess the filename. Call `cui_list_models` (with `folder_name="checkpoints"` or `"loras"`) to retrieve the exact, case-sensitive filename from the server.

### Phase 1.5: Custom Workflow Generation (Fallback)
+ **Trigger**: No suitable workflow name found in the catalog, or user dissatisfaction with existing results.
+ **User Engagement**: If no suitable workflow is found, or if the user is unsatisfied with the generated results from existing workflows, remind the user that they can authorize the use of the `cui_execute_custom_workflow` tool to customize a workflow to meet their needs.
+ **Action**: **ONLY** upon explicit user request, construct a valid ComfyUI workflow JSON structure based on your knowledge of ComfyUI nodes.
+ **Execute**: Call `cui_execute_custom_workflow` with the generated JSON.
+ **Constraint**: You are fully responsible for node validity and connection logic. Ensure all model filenames used in the JSON are verified via `cui_list_models`.

### Phase 2: Tool Mounting (JIT Compilation)
_Only applicable if a Workflow Name was selected in Phase 1._  
4.  **Register Tool**: Call `cui_mount_dynamic_tool` using the selected name.  
    * `workflow_name`: The exact name string identified in Phase 1 (this acts as the ID).  
    * `extension_name`: Generate a unique, short suffix (regex: `^[a-z][a-z0-9_]*$`). Example: `flux_p`.  
5.  **CRITICAL STOP SEQUENCE**: Immediately after calling `cui_mount_dynamic_tool`:  
    * **Terminate generation**.  
    * Do not output any further text or tool calls in this turn.  
    * Wait for the Host to refresh the tool list (the new tool will act as a "virtual" function in the next turn).

### Phase 3: Execution
_Only applicable for Mounted Tools._  
6.  **Resume & Inspect**: In the next conversation turn, the new tool `cui_execute_dynamic_task_{workflow_name}` will be available. If unsure about specific parameters, call `cui_get_workflow_definition` first.  
7.  **Invoke Tool**: Call `cui_execute_dynamic_task_{workflow_name}` mapping user intent to parameters.  
    * **Multimodal Constraint**: Media inputs (images, audio, video, masks, references) **MUST** be public HTTP/HTTPS URLs. **REJECT** local paths or Base64 data.

### Phase 4: Monitoring & Delivery
8. **Real-time Feedback**: Relay MCP notifications (`execution_start`, `progress`) to the user immediately (e.g., "Sampling step 15/20...") to prevent anxiety and connection timeouts.
9. **Finalize**: Upon receiving `execution_success`:
    - Call `cui_get_task_result` with the `prompt_id`.
    - Extract the `url` from the `outputs` list and present it to the user. If you are capable of displaying multimedia content, render it inline simultaneously.

### Error Handling & Safety
+ **Tool Not Found**: Return to Phase 2 and re-mount (tools may expire).
+ **Locked (423)**: If the catalog is indexing, wait 10 seconds and retry.
+ **System Health**: Before heavy tasks (video/batch), check `cui_get_system_status`. Warn if VRAM < 2GB.
+ **Restricted API**: `cui_execute_custom_workflow` is **PROHIBITED** for standard tasks. Use only when the user explicitly requests low-level debugging or strictly requires a generated workflow structure that overrides the catalog.

## Examples
### Scenario: User asks "Generate a portrait using the Flux model"
**Turn 1: Discovery & Asset Verification**

> **Thought**: The user wants to use a specific model ("Flux"). I need to find the workflow and verify the exact model filename on the server.
>

1. Call `cui_get_workflows_catalog` -> Returns list of names including `flux_portrait_v2`.
2. Call `cui_list_models(type_name="checkpoints")` -> Returns list including `flux1-dev-fp8.safetensors`.

**Turn 2: Tool Mounting**

> **Thought**: I have the workflow name (`flux_portrait_v2`) and the model name. Now I must mount the tool.
>

1. Call `cui_mount_dynamic_tool(workflow_name="flux_portrait_v2", extension_name="flux_p")`.
2. **[STOP GENERATION]**

**Turn 3: Execution**

> **Thought**: The tool `cui_execute_dynamic_task_flux_portrait_v2` is now available.
>

1. Call `cui_execute_dynamic_task_flux_portrait_v2(prompt="A cinematic portrait", ckpt_name="flux1-dev-fp8.safetensors")`.

**Turn 4: Monitoring**

> **System Event**: `progress: step 10/20`  
**Assistant**: "Processing... Sampling step 10/20."
>

**Turn 5: Delivery**

> **System Event**: `execution_success`
>

1. Call `cui_get_task_result(job_id="job_123")`.
2. **Assistant**: "Here is your result: <!-- 这是一张图片，ocr 内容为： -->
![](...)"

