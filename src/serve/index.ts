import "@modelcontextprotocol/sdk/client/streamableHttp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import { z } from "zod";
import { t } from "../i18n";
import "../i18n/locales";

import { readFile } from "fs/promises";
import { COMMON } from "../constants";
import { error, errorWithDetail, ok } from "../interface/result";
import {
  ResultToMcpResponse,
  ResultToMcpStringResponse,
  withMcpErrorHandling,
} from "../tools/mcp-helpers";
import {
  collectAndSaveFormatTask,
  collectAndSaveWorkflow,
  getTaskDetailByPromptId,
} from "../workflow";
import {
  createDynamicWorkflowTool,
  executeDynamicWorkflowTool,
  generateToolExampleParams,
  getAllDynamicTools,
  getDynamicTool,
  hasDynamicTool,
} from "../workflow/dynamic-tool";
import { ComfyClient } from "../ws";
import {
  DynamicWorkflowToolData,
  ListDynamicWorkflowToolData,
} from "../interface/dynamic-tool";

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
      tools: {
        listChanged: true,
      },
      resources: {
        listChanged: true,
        subscribe: true,
      },
    },
  },
);

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
    description: `连接ComfyUI的WebSocket服务器，并且获取后ComfyUI中现有的节点信息，最后将这些信息格式化保存到本地文件中`,
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

/**
 * @METHOD
 * @description 获取缓存工作流格式化任务 —— 为防止AGENT不支持 Resources 情况下，使用此接口获取缓存工作流格式化任务
 * @author LaiFQZzr
 * @date 2026/02/02 09:30
 */
server.registerTool(
  "cui_get_workflow_tasks",
  {
    title: "获取工作流任务",
    description: `在初始化工作流或其他 Tool 执行获取工作流任务后，通过路径获取保存工作流任务信息的文件，并读取内容`,
    inputSchema: {},
  },
  withMcpErrorHandling(async ({}) => {
    const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");

    return ResultToMcpStringResponse(content);
  }),
);

/**
 * @METHOD
 * @description 根据prompt_id获取任务详情
 * @author LaiFQZzr
 * @date 2026/02/03 10:31
 */
server.registerTool(
  "cui_get_task_detail",
  {
    title: "根据prompt_id获取任务详情",
    description: `根据prompt_id获取任务详情，包括prompt、outputs、status、meta等项内容`,
    inputSchema: {
      promptId: z.string().describe(t("workflow.promptId")),
    },
  },
  withMcpErrorHandling(async ({ promptId }) => {
    const result = await getTaskDetailByPromptId({
      baseUrl: BASE_URL,
      promptId: promptId,
    });

    return ResultToMcpResponse(result);
  }),
);

/**
 * @METHOD
 * @description 基于历史任务创建动态 Workflow Tool
 *              该工具会分析历史任务的 prompts 结构，提取可配置参数，
 *              生成一个新的 MCP Tool，允许修改参数值但保持结构不变
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
server.registerTool(
  "cui_create_workflow_tool",
  {
    title: "基于历史任务创建动态 Workflow Tool",
    description: `基于历史任务（prompt_id）创建一个可重用的动态 Workflow Tool。

      功能说明：
      1. 分析指定历史任务的 prompts 结构
      2. 提取所有可配置的基础类型参数（排除连接引用）
      3. 生成一个新的 MCP Tool，名称由 toolName 指定
      4. 生成的 Tool 会出现在 cui_list_dynamic_tools 列表中

      使用场景：
      - 当你找到一个成功执行的历史任务，想要基于它创建可重用的模板
      - 需要让 Agent 能够修改工作流参数（如提示词、种子、尺寸等）但不改变结构
      - 创建标准化的工作流工具供后续重复使用
    `,
    inputSchema: {
      promptId: z.string().describe("历史任务的 prompt_id"),
      toolName: z
        .string()
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          "Tool 名称只能包含字母、数字、下划线、连字符",
        )
        .describe("新 Tool 的名称，只能包含字母、数字、下划线、连字符"),
      title: z.string().optional().describe("可选，Tool 的显示标题"),
      description: z.string().optional().describe("可选，Tool 的详细描述"),
    },
  },
  withMcpErrorHandling(async ({ promptId, toolName, title, description }) => {
    // 检查 Tool 名称是否已存在
    if (hasDynamicTool(toolName)) {
      return ResultToMcpResponse(
        error(`Tool "${toolName}" 已存在，请使用其他名称`),
      );
    }

    const startTime = Date.now();

    // 获取任务详情
    const result = await getTaskDetailByPromptId({
      baseUrl: BASE_URL,
      promptId: promptId,
    });

    if (!result.success || !result.detail.data) {
      return ResultToMcpResponse(error("获取任务详情失败"));
    }

    const workflow = result.detail.data;

    // 创建动态 Tool
    const tool = createDynamicWorkflowTool(
      toolName,
      promptId,
      workflow,
      title,
      description,
    );

    // 构建响应
    const response: DynamicWorkflowToolData = {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      sourcePromptId: tool.sourcePromptId,
      configurableParamsCount: tool.configurableParams.length,
      configurableParams: tool.configurableParams.map((p) => ({
        key: `${p.nodeId}_${p.inputKey}`,
        path: p.path,
        type: p.type,
        defaultValue: p.defaultValue,
        description: p.description,
        nodeTitle: p.nodeTitle,
        classType: p.classType,
      })),
      exampleUsage: generateToolExampleParams(tool),
    };

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        `成功创建动态 Tool: ${toolName}`,
        response,
        {
          action: "cui_create_workflow_tool",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 列出所有已创建的动态 Workflow Tools
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
server.registerTool(
  "cui_list_dynamic_tools",
  {
    title: "列出所有动态 Workflow Tools",
    description: `获取所有通过 cui_create_workflow_tool 创建的动态 Tool 列表`,
    inputSchema: {},
  },
  withMcpErrorHandling(async () => {
    const startTime = Date.now();

    const tools = getAllDynamicTools();

    const executionTime = Date.now() - startTime;

    const response: ListDynamicWorkflowToolData = {
      count: tools.length,
      tools: tools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        sourcePromptId: tool.sourcePromptId,
        configurableParamsCount: tool.configurableParams.length,
        createdAt: new Date(tool.createdAt).toISOString(),
      })),
    };

    return ResultToMcpResponse(
      ok(
        `成功获取所有动态 Workflow Tools`,
        response,
        {
          action: "cui_list_dynamic_tools",
        },
        executionTime,
      ),
    );
  }),
);

/**
 * @METHOD
 * @description 执行动态 Workflow Tool
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
server.registerTool(
  "cui_execute_dynamic_tool",
  {
    title: "执行动态 Workflow Tool",
    description: `执行通过 cui_create_workflow_tool 创建的动态 Tool。
      使用说明：
      1. 先使用 cui_list_dynamic_tools 查看可用的动态 Tools
      2. 使用 cui_get_dynamic_tool_detail 获取 Tool 的参数详情
      3. 调用此工具执行，传入 toolName 和需要修改的参数

      注意：
      - 未提供的参数将使用默认值
      - 只能修改参数值，不能修改工作流结构
      - 参数类型必须与定义一致
    `,
    inputSchema: {
      toolName: z.string().describe("要执行的动态 Tool 名称"),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          "要修改的参数，key 格式为 nodeId_inputKey，未提供的参数使用默认值",
        ),
    },
  },
  withMcpErrorHandling(async ({ toolName, params = {} }) => {
    const tool = getDynamicTool(toolName);

    if (!tool) {
      return ResultToMcpResponse(
        errorWithDetail(
          `Tool "${toolName}" 不存在`,
          `availableTools: ${getAllDynamicTools().map((t) => t.name)}`,
        ),
      );
    }

    const execResult = await executeDynamicWorkflowTool(toolName, params);

    return ResultToMcpResponse(ok("成功执行动态 Workflow Tool", execResult));
  }),
);

/**
 * @METHOD
 * @description 获取动态 Tool 的详细参数信息
 * @author LaiFQZzr
 * @date 2026/02/03 14:50
 */
server.registerTool(
  "cui_get_dynamic_tool_detail",
  {
    title: "获取动态 Tool 详情",
    description: `获取指定动态 Tool 的详细参数信息和默认值，用于了解如何调用 cui_execute_dynamic_tool`,
    inputSchema: {
      toolName: z.string().describe("动态 Tool 名称"),
    },
  },
  withMcpErrorHandling(async ({ toolName }) => {
    const tool = getDynamicTool(toolName);

    if (!tool) {
      return ResultToMcpResponse(error(`Tool "${toolName}" 不存在`));
    }

    const response: DynamicWorkflowToolData = {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      sourcePromptId: tool.sourcePromptId,
      createdAt: new Date(tool.createdAt).toISOString(),
      configurableParams: tool.configurableParams.map((p) => ({
        key: `${p.nodeId}_${p.inputKey}`,
        path: p.path,
        type: p.type,
        defaultValue: p.defaultValue,
        description: p.description,
        nodeTitle: p.nodeTitle,
        classType: p.classType,
      })),
      exampleUsage: {
        toolName: tool.name,
        params: generateToolExampleParams(tool),
      },
    };

    return ResultToMcpResponse(
      ok("成功获取动态 Tool 的详细参数信息", response),
    );
  }),
);

/**
 * @METHOD
 * @description 将工作流格式化任务注册为 AGENT 可见资源
 * @author LaiFQZzr
 * @date 2026/02/02 09:36
 */
server.registerResource(
  "workflow_tasks",
  COMMON.WORKFLOW_RESOURCE_URI,
  {
    title: "本地 Workflow 文件",
    description: "AGENT 生成并保存的工作流文件",
    mimeType: "application/json",
  },
  async (uri): Promise<ReadResourceResult> => {
    try {
      const content = await readFile(COMMON.WORKFLOW_PATH, "utf-8");

      return {
        contents: [
          {
            uri: uri.href,
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
              uri: uri.href,
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
