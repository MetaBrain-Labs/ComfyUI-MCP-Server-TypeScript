## Examples

### Scenario: User asks "Generate a portrait using the Flux model"

**Turn 1: Discovery & Asset Verification**

> **Thought**: The user wants to use a specific model ("Flux"). I need to find the workflow and verify the exact model filename on the server.

1. Call `cui_get_workflows_catalog` -> Returns list of names including `flux_portrait_v2`.

**Turn 2: Tool Mounting**

> **Thought**: I have the workflow name (`flux_portrait_v2`) and the model name. Now I must mount the tool.

1. Call `cui_mount_dynamic_tool`.
2. **[STOP GENERATION]**

**Turn 3: Execution**

> **Thought**: The tool `cui_execute_dynamic_task` is now available.

1. Call `cui_execute_dynamic_task`.

**Turn 4: Monitoring**

> **System Event**: `progress: step 10/20`  
> **Assistant**: "Processing... Sampling step 10/20."

**Turn 5: Delivery**

> **System Event**: `execution_success`

1. Output the URL from the result of `cui_execute_dynamic_task` to the user as the final deliverable.
2. **Assistant**: "Here is your result:
