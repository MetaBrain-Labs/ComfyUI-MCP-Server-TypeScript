import "@modelcontextprotocol/sdk/client/streamableHttp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { z } from "zod";
import { t } from "../i18n";
import "../i18n/locales";

import { readFile } from "fs/promises";
import { COMMON } from "../constants";
import {
  ResultToMcpResponse,
  withMcpErrorHandling,
} from "../tools/mcp-helpers";
import { collectAndSaveFormatTask, collectAndSaveWorkflow } from "../workflow";
import { ComfyClient } from "../ws";

const BASE_URL = process.env.COMFY_UI_SERVER_IP ?? "http://192.168.0.171:8188";

/**
 * @METHOD
 * @description 创建 MCP 服务实例
 * @author LaiFQZzr
 * @date 2026/01/09 12:02
 */
const server = new McpServer(
  {
    name: "comfy-ui-advanced",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);
// const server = new McpServer(
//   {
//     name: "comfy-ui-advanced",
//     version: "1.0.0",
//   },
//   {
//     capabilities: {
//       tools: {},
//       resources: {},
//     },
//     instructions: t("workflow.instructions").trim(),
//   },
// );

/**
 * @METHOD 
 * @description 扫描读取ComfyUI运行历史，提取工作流的API文件，保存至项目下的工作流文件夹中。
                1. 按时间间隔（可配置，单位ms）对任务运行历史发起一次扫描。 
                2. 历史记录为空的情况下，扫描ComfyUI下的所有工作流，获取其中带有标记的工作流的API文件，并发布绘图任务检查可用性（实现思路：通过/prompt发布绘图任务，通过/ws监听是否可用）。
                  a. 若在上述步骤中，ComfyUI出现程序性错误，则停止运行，并抛出错误。
                3. 提取的工作流需为 运行成功 且 带工作流描述节点标记 的工作流。
                4. API文件名称与工作流名称相同，保存同一个工作流的最新API文件时，以名称为主键，覆盖旧的文件。
 * @author LaiFQZzr
 * @date 2026/01/15 15:44
 */
server.registerTool(
  "cui_collect_workflow",
  {
    title: t("workflow.collectedContent.title"),
    description: t("workflow.collectedContent.description"),
    inputSchema: {
      maxItems: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe(t("workflow.collectedContent.maxItems")),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe(t("workflow.collectedContent.offset")),
      append: z
        .boolean()
        .optional()
        .default(true)
        .describe(t("workflow.collectedContent.append")),
    },
  },
  withMcpErrorHandling(async ({ maxItems, offset, append }) => {
    const result = await collectAndSaveWorkflow({
      baseUrl: BASE_URL,
      maxItems: maxItems,
      offset: offset,
      append: append,
    });

    return ResultToMcpResponse(result);
  }),
);

/**
 * @METHOD
 * @description 格式化并保存工作流任务信息，格式化后投喂给AGENT
 * @author LaiFQZzr
 * @date 2026/01/30 10:16
 */
server.registerTool(
  "cui_init_workflow",
  {
    title: "初始化工作流",
    description:
      "连接ComfyUI的WebSocket服务器，并且获取后ComfyUI中现有的节点信息，最后将这些信息格式化保存到本地文件中",
    inputSchema: {
      maxItems: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe(t("workflow.collectedContent.maxItems")),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe(t("workflow.collectedContent.offset")),
      append: z
        .boolean()
        .optional()
        .default(true)
        .describe(t("workflow.collectedContent.append")),
    },
  },
  withMcpErrorHandling(async ({ maxItems, offset, append }) => {
    const client = new ComfyClient();

    await client.connect();

    client.sendJson({
      type: "feature_flags",
      data: {
        supports_preview_metadata: true,
        supports_manager_v4_ui: true,
      },
    });

    const result = await collectAndSaveFormatTask({
      baseUrl: BASE_URL,
      maxItems: maxItems,
      offset: offset,
      append: append,
    });

    return ResultToMcpResponse(result);
  }),
);

// server.registerTool(
//   "cui_execute_workflow_original_task",
//   {
//     title: t("workflow.executeWorkflowOriginalTask.title"),
//     description: t("workflow.executeWorkflowOriginalTask.description"),
//     inputSchema: {
//       promptId: z.string().describe(t("workflow.promptId")),
//     },
//   },
//   withMcpErrorHandling(async ({ promptId }) => {
//     // 连接上WebSocket

//     // 根据promptId执行工作流

//     //

//     const client = new ComfyClient();

//     await client.connect();

//     client.sendJson({
//       type: "feature_flags",
//       data: {
//         supports_preview_metadata: true,
//         supports_manager_v4_ui: true,
//       },
//     });
//   }),
// );

// 启动阶段

server.registerResource(
  "workflow_file",
  COMMON.WORKFLOW_RESOURCE_URI,
  {
    title: "本地 Workflow 文件",
    description: "AGENT 生成并保存的工作流文件",
    mimeType: "application/json",
  },
  async () => {
    try {
      const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");

      return {
        contents: [
          {
            uri: COMMON.WORKFLOW_RESOURCE_URI,
            mimeType: "application/json",
            text: content,
          },
        ],
      };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return {
          contents: [
            {
              uri: COMMON.WORKFLOW_RESOURCE_URI,
              mimeType: "application/json",
              text: "[]",
            },
          ],
        };
      }

      throw err;
    }
  },
);

export default server;
