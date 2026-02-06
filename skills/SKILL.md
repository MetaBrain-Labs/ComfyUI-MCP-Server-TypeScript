---
name: generate-images-or-videos-best-practices
description: workflow automation for generating images/videos
metadata:
  tags: workflow, image, animation, composition
---

## When to use

Whenever you handle image/video generation, you can apply these skills to gain domain-specific knowledge.

## How to use

Read individual rule files for detailed explanations and code examples:

- [rules/comfyui.md](rules/comfyui.md) - Generate images and videos using ComfyUI

## Notice

1. When using the Tool in the MCP service's execution workflow type, if the user has not specified asynchronous execution, you must not arbitrarily invoke other MCP Tools during the Tool's execution to proactively check results or perform other operations midway. Instead, wait for the Tool's execution result.

2. Long tasks in the execution workflow type are configured with a maximum timeout; you do not need to actively disconnect.
