---
name: comfyui-workflow-agent
description: ComfyUI image and video generation workflow orchestrator. Use this skill when users request AI image generation, video creation, or any generative AI tasks using ComfyUI. Triggers include requests like "generate an image", "create a picture", "make a video", "use ComfyUI", or any variation of AI content generation requests. This skill guides the Discovery-Mount-Execute workflow process for ComfyUI MCP tools.
---

# ComfyUI Workflow Agent

This skill enables Claude to orchestrate ComfyUI generative AI workflows through MCP (Model Context Protocol) tools.

## When to Use This Skill

Use this skill when users request:
- Image generation (e.g., "create an image of...", "generate a picture with...")
- Video creation (e.g., "make a video of...", "create an animation...")
- AI art or generative content
- Specific mentions of ComfyUI, Flux, Stable Diffusion, or other generative models
- Photo editing or enhancement using AI models

## Quick Start Workflow

**IMPORTANT**: Always follow the 4-phase Discovery-Mount-Execute loop. Never skip phases.

### Essential First Step

Before executing ANY ComfyUI workflow, **always read the operational guide**:

```bash
view references/comfyui_mcp_guide.md
```

This guide contains critical operational procedures that you MUST follow exactly.

## The 4-Phase Process Overview

When a user requests image/video generation:

1. **Phase 1: Discovery**
   - Understand user intent
   - Call `comfy_list_workflows` to find available workflows
   - Verify model requirements with `comfy_list_models` if needed

2. **Phase 2: Mount Tool**
   - Call `comfy_mount_dynamic_tool` with chosen workflow
   - Provide unique extension name
   - **STOP - Wait for next turn**

3. **Phase 3: Execute**
   - Use newly available `run_workflow_<extension>` tool
   - Submit workflow with user parameters
   - Receive `job_id`

4. **Phase 4: Monitor**
   - Poll `comfy_get_task_result` with job_id
   - Report status to user
   - Deliver final result URL when complete

## Critical Rules

- **Never skip the mounting phase** - Workflows must be mounted before execution
- **Always stop after mounting** - Do not execute in the same turn as mounting
- **Read the guide first** - The operational guide in `references/` contains essential error handling and workflow details
- **Verify models exist** - Use `comfy_list_models` to confirm exact filenames before use
- **Check system resources** - Use `comfy_get_system_status` for resource-intensive tasks

## Available MCP Tools

The following ComfyUI MCP tools will be available:

- `comfy_list_workflows` - Discover available workflows
- `comfy_mount_dynamic_tool` - Register a workflow for execution
- `comfy_list_models` - List available models/checkpoints/LoRAs
- `comfy_get_workflow_definition` - Get detailed workflow schema
- `comfy_get_task_result` - Check generation status and retrieve results
- `comfy_get_system_status` - Check server resources (VRAM, etc.)
- `comfy_reload_config` - Refresh workflow index if needed
- `run_workflow_<extension>` - Execute mounted workflows (dynamically created)

## Detailed Operational Guide

For complete operational procedures, error handling, and advanced usage, always refer to:

**`references/comfyui_mcp_guide.md`**

This reference document contains:
- Detailed phase-by-phase instructions
- Error handling strategies
- Resource management guidelines
- Parameter mapping instructions
- Common gotchas and solutions

## Example User Interactions

**User**: "Generate an image of a female character with a sci-fi background"

**Response Flow**:
1. Read operational guide from references
2. Call `comfy_list_workflows` to find suitable workflow (e.g., sci-fi or portrait workflow)
3. Call `comfy_mount_dynamic_tool` with workflow ID and extension name like "scifi_gen"
4. **Stop and wait for next turn**
5. (Next turn) Call `run_workflow_scifi_gen` with user's prompt
6. Use `comfy_get_task_result` to monitor and deliver final image URL

**User**: "Create a cyberpunk avatar using Flux model"

**Response Flow**:
1. Read operational guide
2. Call `comfy_list_workflows` to find Flux-based portrait workflow
3. Call `comfy_list_models` with folder="checkpoints" to verify Flux model filename
4. Mount workflow with `comfy_mount_dynamic_tool`
5. **Stop and wait**
6. (Next turn) Execute with verified model name and cyberpunk prompt
7. Monitor and deliver results
