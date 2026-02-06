import "@modelcontextprotocol/sdk/client/streamableHttp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ErrorCode,
  McpError,
  type ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import { z } from "zod";
import { t } from "../i18n";
import "../i18n/locales";

import { readFile } from "fs/promises";
import { COMMON } from "../constants";
import {
  DynamicWorkflowToolData,
  ListDynamicWorkflowToolData,
} from "../interface/dynamic-tool";
import { error, errorWithDetail, ok } from "../interface/result";
import {
  buildComfyViewUrls,
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
  deleteDynamicTool,
  executeDynamicWorkflowTool,
  generateToolExampleParams,
  getAllDynamicTools,
  getDynamicTool,
  hasDynamicTool,
} from "../workflow/dynamic-tool";
import {
  executeWorkflowTaskByPrompts,
  waitForExecutionCompletion,
} from "../workflow/tasks";
import { ComfyClient } from "../ws";

const BASE_URL = process.env.COMFY_UI_SERVER_IP ?? "http://192.168.0.171:8188";

const client = new ComfyClient();

await client.connect();

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
 * @description 获取工作流任务目录，并且格式化（提炼）任务信息，任务信息保存本地及返回输出给 AGENT
 * @author LaiFQZzr
 * @date 2026/02/02 09:30
 */
server.registerTool(
  "cui_list_models",
  {
    title: "获取模型列表",
    description: `获取ComfyUI现有模型列表`,
    inputSchema: {},
  },
  withMcpErrorHandling(async ({}) => {
    return ResultToMcpStringResponse("这是模型结果");
  }),
);

/**
 * @METHOD
 * @description 获取工作流任务目录，并且格式化（提炼）任务信息，任务信息保存本地及返回输出给 AGENT
 * @author LaiFQZzr
 * @date 2026/02/02 09:30
 */
server.registerTool(
  "cui_get_workflows_catalog",
  {
    title: "获取工作流任务目录",
    description: `获取工作流任务目录，并且格式化（提炼）任务信息，任务信息保存本地及返回输出给 AGENT。AGENT 可通过分析该信息最终选择更符合用户请求的生成任务`,
    inputSchema: {
      maxItems: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(10)
        .describe(t("workflow.collectedContent.maxItems")),
    },
  },
  withMcpErrorHandling(async ({ maxItems }) => {
    let hasMore: boolean = true;

    for (let i = 0; hasMore; i++) {
      const result = await collectAndSaveFormatTask({
        baseUrl: BASE_URL,
        maxItems,
        offset: i * maxItems,
        append: i === 0 ? false : true,
      });

      hasMore = result.detail.data?.pagination?.hasNextPage || false;
    }

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
  "cui_mount_dynamic_tool",
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
        required: p.required,
      })),
      requiredParams: tool.configurableParams
        .filter((p) => p.required)
        .map((p) => `${p.nodeId}_${p.inputKey}`),
      exampleUsage: generateToolExampleParams(tool),
    };

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        `成功创建动态 Tool: ${toolName}`,
        response,
        {
          action: "cui_mount_dynamic_tool",
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
    description: `获取所有通过 cui_mount_dynamic_tool 创建的动态 Tool 列表`,
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
    description: `执行通过 cui_mount_dynamic_tool 创建的动态 Tool。
      使用说明：
      1. 先使用 cui_list_dynamic_tools 查看可用的动态 Tools
      2. 调用此工具执行，传入 toolName 和需要修改的参数
      3. 分析用户意图，是否需要异步输出

      注意：
      - 未提供的参数将使用默认值
      - 只能修改参数值，不能修改工作流结构
      - 参数类型必须与定义一致
    `,
    inputSchema: {
      toolName: z.string().describe("要执行的动态 Tool 名称"),
      isAsync: z.boolean().default(false).describe("是否异步执行"),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          "要修改的参数，key 格式为 nodeId_inputKey，未提供的参数使用默认值",
        ),
    },
  },
  withMcpErrorHandling(async ({ toolName, isAsync, params = {} }) => {
    const startTime = Date.now();

    const tool = getDynamicTool(toolName);

    if (!tool) {
      return ResultToMcpResponse(
        errorWithDetail(
          `Tool "${toolName}" 不存在`,
          `availableTools: ${getAllDynamicTools().map((t) => t.name)}`,
        ),
      );
    }

    if (!client.isConnected()) {
      await client.connect();
    }

    if (!client.isConnected()) {
      throw new McpError(ErrorCode.InternalError, "WebSocket服务器未连接");
    }

    // 获取拼接AGENT修改参数后的Prompt
    const execResult = await executeDynamicWorkflowTool(
      toolName,
      params,
      client,
    );

    // 根据拼接后的Prompt执行工作流
    const clientId = client.getClientId();
    console.error(`[工作流提交] Client ID: ${clientId}`);

    const submitResult = await executeWorkflowTaskByPrompts({
      baseUrl: BASE_URL,
      prompts: execResult,
      clientId: clientId,
    });

    console.error(`[工作流已提交] Prompt ID: ${submitResult.prompt_id}`);

    if (!isAsync) {
      const executionResult = await waitForExecutionCompletion({
        client,
        promptId: submitResult.prompt_id,
        timeout: 10 * 60 * 1000,
      });

      if (!executionResult.success) {
        deleteDynamicTool(toolName);

        return ResultToMcpResponse(
          errorWithDetail(
            `工作流执行失败: ${executionResult.error}`,
            `Prompt ID: ${submitResult.prompt_id}`,
          ),
        );
      }

      const executionTime = Date.now() - startTime;

      return ResultToMcpResponse(
        ok(
          "成功执行动态 Workflow Tool",
          {
            promptId: submitResult.prompt_id,
            img: buildComfyViewUrls(executionResult, BASE_URL),
            outputs: executionResult.outputs,
          },
          {
            action: "cui_execute_dynamic_tool",
          },
          executionTime,
        ),
      );
    }

    const executionTime = Date.now() - startTime;

    return ResultToMcpResponse(
      ok(
        "成功执行动态 Workflow Tool",
        {
          promptId: submitResult.prompt_id,
          description: "选择异步执行，请一段时间后访问ComfyUI查看结果",
        },
        {
          action: "cui_execute_dynamic_tool",
        },
        executionTime,
      ),
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
