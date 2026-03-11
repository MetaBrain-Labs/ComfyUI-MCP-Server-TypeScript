# ComfyUI MCP Server – Agent Reference (Custom Workflow)

## Example User Request

User instruction:

> Use the provided API JSON workflow to generate an image of a **cat and a dog**.

Requirements:

- The **cat and dog are lying down**
- The **cat is grooming (licking) the dog**
- The background must contain a **grassy meadow**
- The weather must be **sunny**
- **No humans** should appear in the image

---

# Execution Flow

The Agent must execute the following tool calls **in order**:

```
1. get_core_manual
2. save_custom_workflow
3. mount_workflow
4. queue_prompt
```

Optional:

```
5. save_task_assets
```

---

# Step 1 — Retrieve Core Manual

### Tool

```
comfy-ui-advanced/get_core_manual
```

### Purpose

Retrieve the **ComfyUI MCP core manual** when the Host does not support Skills or when no Skill matches the request.

### Request

```json
{}
```

### Example Response

```json
{
  "success": true,
  "message": "Core manual loaded. Please strictly follow its protocols and parameter strategies for subsequent operations.",
  "detail": {
    "data": "...",
    "code": 200,
    "timestamp": 1773194304101
  }
}
```

---

# Step 2 — Save Custom Workflow

### Tool

```
comfy-ui-advanced/save_custom_workflow
```

### Purpose

Convert the provided **ComfyUI API JSON** into a workflow file and validate its feasibility.

If validation succeeds:

- The workflow is saved in the **workflow directory**
- A **promptId** is returned

### Request

```json
{
  "filename": "cat_dog_workflow.json",
  "apiJson": { ... }
}
```

(The `apiJson` is the ComfyUI workflow JSON provided by the user.)

### Example Response

```json
{
  "success": true,
  "message": "Custom workflow saved",
  "detail": {
    "data": {
      "filePath": "E:\\comfyui-mcp\\workflow\\cat_dog_workflow.json",
      "promptId": "a068f812-db05-4255-b755-596799e3dc22"
    }
  }
}
```

### Important Output

The Agent must store:

```
promptId
```

Example:

```
a068f812-db05-4255-b755-596799e3dc22
```

This value will be used in the next step.

---

# Step 3 — Mount Workflow as a Dynamic Tool

### Tool

```
comfy-ui-advanced/mount_workflow
```

### Purpose

Mount the saved workflow as a **dynamic executable tool**.

### Request

```json
{
  "promptId": "a068f812-db05-4255-b755-596799e3dc22",
  "toolName": "cat_dog_workflow"
}
```

### Response (Key Data)

The response returns the **configurable parameters**.

Example:

```json
{
  "name": "cat_dog_workflow",
  "configurableParams": [
    {
      "key": "3_text",
      "description": "Positive prompt"
    },
    {
      "key": "4_text",
      "description": "Negative prompt"
    },
    {
      "key": "12_value",
      "description": "Random seed"
    }
  ]
}
```

### Configurable Parameters

| Parameter  | Description     |
| ---------- | --------------- |
| `3_text`   | Positive prompt |
| `4_text`   | Negative prompt |
| `12_value` | Random seed     |

### Agent Constraints

Allowed:

```
Modify parameter values
```

Not allowed:

```
Modify workflow structure
Add or remove nodes
```

---

# Step 4 — Execute Workflow

### Tool

```
comfy-ui-advanced/queue_prompt
```

### Purpose

Execute the mounted workflow with customized parameters.

### Request

```json
{
  "workflowName": "cat_dog_workflow",
  "isAsync": false,
  "params": {
    "3_text": "A cat and a dog lying down on a grassy meadow, the cat is grooming the dog, sunny weather, blue sky, no people, realistic style, high quality, detailed",
    "4_text": "people, human, buildings, urban, rainy, cloudy, low quality, blurry, distorted",
    "12_value": 42
  }
}
```

### Prompt Strategy

Positive prompt should include:

```
cat and dog interaction
lying posture
grooming behavior
grassy meadow background
sunny weather
realistic style
```

Negative prompt should exclude:

```
humans
urban environments
bad quality
visual artifacts
```

---

# Execution Result

Example response:

```json
{
  "success": true,
  "detail": {
    "data": {
      "promptId": "bd47c07f-6dc6-4b7a-8ed1-38535314de79",
      "img": [
        "http://192.168.0.171:8188/view?filename=ComfyUI_temp_bldgb_00003_.png"
      ]
    }
  }
}
```

### Important Output

```
Generated image URL
promptId
```

---

# Optional Step — Save Generated Assets

### Tool

```
comfy-ui-advanced/save_task_assets
```

### Purpose

Save generated images to the local **assets directory**.

### Request

```json
{
  "promptId": "bd47c07f-6dc6-4b7a-8ed1-38535314de79"
}
```

---

# Agent Execution Summary

Complete workflow:

```
1 Retrieve MCP manual
get_core_manual

2 Save user-provided workflow
save_custom_workflow

3 Mount workflow as dynamic tool
mount_workflow

4 Execute workflow
queue_prompt

5 (Optional) Save generated assets
save_task_assets
```
