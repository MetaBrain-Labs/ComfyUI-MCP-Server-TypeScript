/*
  MCP Server 的核心运行依赖
    管理：
      tool 注册
      请求分发
      响应封装 
*/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "@modelcontextprotocol/sdk/client/streamableHttp";

/* 
  工具输入的 schema 定义
*/
import { z } from "zod";
import "dotenv/config";

import { collectAndSaveWorkflow } from "../workflow";
import { resultToMcpResponse } from "../mcp/adapter";

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
 * @description 获取历史任务数量
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
        .describe("单次获取最多历史任务条数"),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe("分页获取偏移量"),
    },
  },
  async ({ maxItems, offset }) => {
    const result = await collectAndSaveWorkflow({
      baseUrl: BASE_URL,
      maxItems: maxItems,
      offset: offset,
    });

    return {
      content: [
        {
          type: "text",
          text:
            "### ComfyUI 工作流收集结果\n" + JSON.stringify(result, null, 2),
        },
      ],
    };
    // return resultToMcpResponse(result);
  },
);

export default server;
