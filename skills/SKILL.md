---
name: workflow-guided-image-video-generation-optimization
description: This skill enables an AGENT to generate images and videos through structured workflows and to iteratively optimize the final output by adjusting parameters at each workflow node.
metadata:
  tags: Workflow-based image & video generation, Node-level parameter control, Multi-stage generation optimization, User intent inference, Vague prompt interpretation
---

## When to use

Whenever you handle image/video generation, you can apply these skills to gain domain-specific knowledge.

## How to use

Read individual rule files for detailed explanations and code examples:

- [rules/comfyui.md](rules/comfyui.md) - Generate images and videos using ComfyUI

## Notice

1. When using the Tool in the MCP service's execution workflow type, if the user has not specified asynchronous execution, you must not arbitrarily invoke other MCP Tools during the Tool's execution to proactively check results or perform other operations midway. Instead, wait for the Tool's execution result.

2. Long tasks in the execution workflow type are configured with a maximum timeout; you do not need to actively disconnect.
