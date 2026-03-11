# ComfyUI MCP Server – Agent Reference

## Example User Request

User request:

> Generate a high-definition image of a dog.

Requirements:

- The image must be **clear and highly detailed**
- **Photorealistic style**
- Include **cyberpunk elements**

---

# Standard Execution Flow

The Agent must call MCP tools in the following order:

```
1. get_core_manual
2. get_workflows_catalog
3. mount_workflow
4. queue_prompt
```

---

# Step 1 — Retrieve Core Manual

### Tool

`comfy-ui-advanced/get_core_manual`

### Purpose

When the Host does not support Skills or no Skill is matched, the Agent must retrieve the **ComfyUI MCP core manual** and follow its protocol for subsequent operations.

### Request

```json
{}
```

### Response

```json
{
  "success": true,
  "message": "Core manual loaded. Please strictly follow its protocols and parameter strategies for subsequent operations.",
  "detail": {
    "data": "---\r\nname: comfyui-mcp-server\r\ndescription: ....",
    "code": 200,
    "timestamp": 1773194304101
  },
  "metadata": {
    "action": "get_core_manual"
  }
}
```

---

# Step 2 — Retrieve Workflow Catalog

### Tool

`comfy-ui-advanced/get_workflows_catalog`

### Purpose

Retrieve all available workflows from **ComfyUI**.

The Agent must determine which workflow best matches the user request by analyzing:

```
name
description
parameters
```

### Request

```json
{}
```

### Example Response

```json
[
  {
    "name": "Generate HD Image",
    "id": "13c8e939-fec5-4d40-b8a5-a37a57a60c6a",
    "description": "Generate a high-definition image with background",
    "parameters": [
      "CLIPTextEncode => Positive Prompt",
      "CLIPTextEncode => Negative Prompt",
      "PrimitiveInt => KSampler Random Seed"
    ]
  }
]
```

### Example Decision

User request:

```
Generate a high-definition dog image
```

Selected workflow:

```
Generate HD Image
```

Workflow ID:

```
13c8e939-fec5-4d40-b8a5-a37a57a60c6a
```

---

# Step 3 — Mount Workflow as a Dynamic Tool

### Tool

`comfy-ui-advanced/mount_workflow`

### Purpose

Convert the selected workflow into a **callable dynamic tool**.

The Agent must provide:

```
promptId = workflow.id
toolName = custom tool name
```

### Request

```json
{
  "promptId": "13c8e939-fec5-4d40-b8a5-a37a57a60c6a",
  "toolName": "generate_hd_image"
}
```

### Response (Key Information)

The response returns **configurable parameters**.

```json
{
  "name": "generate_hd_image",
  "configurableParams": [
    {
      "key": "3_text",
      "description": "CLIPTextEncode positive prompt"
    },
    {
      "key": "4_text",
      "description": "CLIPTextEncode negative prompt"
    },
    {
      "key": "11_value",
      "description": "Random seed"
    }
  ]
}
```

### Agent Constraints

Allowed:

```
Modify parameter values
```

Not allowed:

```
Modify workflow structure
```

---

# Step 4 — Execute Workflow

### Tool

`comfy-ui-advanced/queue_prompt`

### Purpose

Execute the mounted workflow using configured parameters.

### Request

```json
{
  "workflowName": "generate_hd_image",
  "params": {
    "11_value": 248597913659849,
    "3_text": "A photorealistic dog, detailed fur texture, realistic eyes with reflections, cyberpunk style, neon lighting, futuristic city background with glowing neon signs, chrome and metal elements, rain-soaked streets, dramatic lighting, high definition, ultra detailed, 8k quality, sharp focus, professional photography",
    "4_text": "blurry, low quality, cartoon, animated, deformed, ugly, bad anatomy, extra limbs, watermark, signature, text"
  }
}
```

### Response

The tool returns the generated image:

```json
{
  "promptId": "b92b340a-6ef0-44be-b44f-b5ffbe0ab3e1",
  "img": [
    "http://192.168.0.171:8188/view?filename=ComfyUI_temp_rrbpg_00001_.png"
  ]
}
```

---

# Agent Execution Summary

Complete workflow:

```
1 Retrieve core manual
get_core_manual

2 Retrieve workflow catalog
get_workflows_catalog

3 Select the best matching workflow
(based on name + description)

4 Mount workflow
mount_workflow

5 Execute workflow
queue_prompt
```
