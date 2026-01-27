import "@modelcontextprotocol/sdk/client/streamableHttp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { z } from "zod";

import {
  ResultToMcpResponse,
  withMcpErrorHandling,
} from "../tools/mcp-helpers";
import { collectAndSaveWorkflow } from "../workflow";

const BASE_URL = process.env.COMFY_UI_SERVER_IP ?? "http://192.168.0.171:8188";

/**
 * @METHOD
 * @description 创建 MCP 服务实例
 * @author LaiFQZzr
 * @date 2026/01/09 12:02
 */
const server = new McpServer({
  name: "comfy-ui-advanced",
  version: "1.0.0",
});

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
  "collect_workflow",
  {
    title: "查询 ComfyUI 工作流历史任务",
    description:
      "从 ComfyUI 中获取工作流历史任务，根据情况可以设置获取数量和偏移量",
    inputSchema: {
      maxItems: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe(
          "单次获取的最大历史任务条数。建议值: 小批量用 2 - 3,完整获取用 10",
        ),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe(
          "分页偏移量,从0开始。例如: offset = 0 获取前 N 条,offset = N 获取接下来的 N 条",
        ),
      append: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "存储模式。true = 追加到现有数据(累积), false = 覆盖现有数据(重置)",
        ),
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

export default server;
