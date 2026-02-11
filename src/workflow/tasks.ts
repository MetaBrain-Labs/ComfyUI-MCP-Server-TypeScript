import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";
import axios from "axios";
import { ExecutePromptResult, ExecutionResult } from "../interface/execute";
import {
  ComfyPromptConfig,
  ComfyTaskResponse,
  WorkflowSimpleData,
} from "../interface/task";
import { ComfyUIWorkflow } from "../interface/workflow";
import { ComfyClient } from "../ws";

export interface FetchTasksOptions {
  baseUrl: string;
  maxItems?: number;
  offset?: number;
}

export interface FetchTaskOptions {
  baseUrl: string;
  promptId: string;
}

export interface ExecuteTaskOptions {
  baseUrl: string;
  prompts: ComfyPromptConfig;
  clientId?: string;
}

export interface WaitForExecutionOptions {
  client: ComfyClient;
  promptId: string;
  timeout?: number;
  onProgress?: (progress: ExecutionProgress) => void;
}

/** 执行进度信息 */
export interface ExecutionProgress {
  /** 当前执行阶段 */
  stage: "starting" | "executing" | "progress" | "completed" | "error";
  /** 提示信息 */
  message: string;
  /** 当前进度 (0-100) */
  percent?: number;
  /** 当前执行的节点 ID */
  nodeId?: string;
  /** 当前值 (如采样步数当前值) */
  current?: number;
  /** 最大值 (如采样步数总步数) */
  max?: number;
  /** 已执行时间 (毫秒) */
  elapsedTime?: number;
}

/**
 * @METHOD
 * @description 获取历史任务（支持分页）
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchHistoryTasks(
  options: FetchTasksOptions,
): Promise<{ successTasks: ComfyTaskResponse; total: number; fail: number }> {
  const { baseUrl, maxItems, offset } = options;

  const url = `${baseUrl}/history?max_items=${maxItems}&offset=${offset}`;

  const res = await axios.get<ComfyTaskResponse>(url);

  if (typeof res.data !== "object" || res.data === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid history tasks response",
    );
  }

  const total = Object.entries(res.data).length;

  const successTasks = Object.fromEntries(
    Object.entries(res.data).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  const fail = total - Object.entries(successTasks).length;

  return { successTasks, total, fail };
}

/**
 * @METHOD
 * @description 从工作流列表中获取工作流
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchUserWorkflow(baseUrl: string, clientId: string) {
  const availableWorkflow: string[] = [];

  // 获取用户的工作流列表
  const url = `${baseUrl}/userdata?dir=workflows&recurse=true&split=false&full_info=true`;

  const res = await axios.get<WorkflowSimpleData[]>(url);

  if (res.data === null) {
    throw new McpError(ErrorCode.InternalError, "Not Exist Workflow response");
  }

  for (const item of res.data) {
    const workflowUrl = `${baseUrl}/userdata/workflows%2F${item.path}`;
    const workflowRes = await axios.get<ComfyUIWorkflow>(workflowUrl);

    try {
      const promptRes = await axios.post<ExecutePromptResult>(
        `${baseUrl}/prompt`,
        {
          extra_pnginfo: {
            workflow: workflowRes.data,
          },
          client_id: clientId,
          prompt: {} as ComfyPromptConfig,
        },
      );
      availableWorkflow.push(promptRes.data.prompt_id);

      console.log(`[${promptRes.data.prompt_id}] ${workflowRes.data.id}`);
    } catch (e) {
      // 工作流初始化校验失败
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        console.warn(`Skip workflow ${item.path}: bad request (400)`);
        continue;
      }
    }
  }

  // const total = Object.entries(res.data).length;

  // const successTasks = Object.fromEntries(
  //   Object.entries(res.data).filter(
  //     ([uuid, item]) => item.status.status_str === "success",
  //   ),
  // ) as ComfyTaskResponse;

  // const fail = total - Object.entries(successTasks).length;

  // return { successTasks, total, fail };
  return availableWorkflow;
}

/**
 * @METHOD
 * @description 获取历史任务（支持分页）
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchTaskByPromptId(
  options: FetchTaskOptions,
): Promise<ComfyPromptConfig> {
  const { baseUrl, promptId } = options;

  const url = `${baseUrl}/history/${promptId}`;

  const res = await axios.get<ComfyTaskResponse>(url);

  if (typeof res.data !== "object" || res.data === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid detail tasks response",
    );
  }

  const successTasks = Object.fromEntries(
    Object.entries(res.data).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  if (successTasks === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid detail tasks response",
    );
  }

  return Object.values(successTasks)[0].prompt[2];
}

/**
 * @METHOD
 * @description 执行工作流任务
 * @author LaiFQZzr
 * @date 2026/02/04 15:59
 */
export async function executeWorkflowTaskByPrompts(
  options: ExecuteTaskOptions,
): Promise<ExecutePromptResult> {
  const { baseUrl, prompts, clientId } = options;

  const url = `${baseUrl}/prompt`;
  const data: any = { prompt: { ...prompts } };

  // 如果有 clientId，传递给服务器以关联 WebSocket 消息
  if (clientId) {
    data.client_id = clientId;
  }

  const res = await axios.post<ExecutePromptResult>(url, data);

  if (res.status !== 200) {
    throw new McpError(ErrorCode.InternalError, `执行工作流失败`);
  }

  return res.data;
}

/**
 * @METHOD
 * @description 等待工作流执行完成
 *              通过 WebSocket 监听执行状态，直到收到 execution_success 或 execution_error
 * @author LaiFQZzr
 * @date 2026/02/04 17:10
 */
export async function waitForExecutionCompletion(
  options: WaitForExecutionOptions,
): Promise<ExecutionResult> {
  const { client, promptId, timeout = 5 * 60 * 1000, onProgress } = options;
  const startTime = Date.now();

  console.error(`[等待执行] 开始监听 Prompt ID: ${promptId}`);

  // 发送进度报告的辅助函数
  const reportProgress = (progress: ExecutionProgress) => {
    if (onProgress) {
      onProgress({
        ...progress,
        elapsedTime: Date.now() - startTime,
      });
    }
  };

  return new Promise((resolve, reject) => {
    let isCompleted = false;
    const outputs: Record<string, any> = {};

    // 设置超时
    const timeoutTimer = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        cleanup();
        resolve({
          success: false,
          promptId,
          error: `工作流执行超时（${timeout / 1000}秒）`,
          executionTime: Date.now() - startTime,
        });
      }
    }, timeout);

    // 保存原始钩子函数
    const originalHooks = {
      onExecutionStart: client.hook.onExecutionStart.bind(client.hook),
      onNodeExecuting: client.hook.onNodeExecuting.bind(client.hook),
      onProgress: client.hook.onProgress.bind(client.hook),
      onExecuted: client.hook.onExecuted.bind(client.hook),
      onExecutionSuccess: client.hook.onExecutionSuccess.bind(client.hook),
      onExecutionError: client.hook.onExecutionError.bind(client.hook),
      onExecutionInterrupted: client.hook.onExecutionInterrupted.bind(
        client.hook,
      ),
    };

    // 清理函数：恢复原始钩子
    const cleanup = () => {
      clearTimeout(timeoutTimer);
      client.hook.onExecutionStart = originalHooks.onExecutionStart;
      client.hook.onNodeExecuting = originalHooks.onNodeExecuting;
      client.hook.onProgress = originalHooks.onProgress;
      client.hook.onExecuted = originalHooks.onExecuted;
      client.hook.onExecutionSuccess = originalHooks.onExecutionSuccess;
      client.hook.onExecutionError = originalHooks.onExecutionError;
      client.hook.onExecutionInterrupted = originalHooks.onExecutionInterrupted;
    };

    // 重写钩子函数来监听执行状态
    client.hook.onExecutionStart = (data) => {
      console.error(`[onExecutionStart] 收到消息:`, data);
      originalHooks.onExecutionStart(data);
      if (data.prompt_id === promptId) {
        console.error(`[执行开始] Prompt ID: ${promptId}`);
        reportProgress({
          stage: "starting",
          message: "工作流开始执行",
          percent: 0,
        });
      } else {
        console.error(
          `[执行开始] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onNodeExecuting = (data) => {
      console.error(`[onNodeExecuting] 收到消息:`, data);
      originalHooks.onNodeExecuting(data);
      if (data.prompt_id === promptId && data.node) {
        console.error(`[执行节点] Node: ${data.node}`);
        reportProgress({
          stage: "executing",
          message: `正在执行节点: ${data.node}`,
          nodeId: data.node,
        });
      } else {
        console.error(
          `[执行节点] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onProgress = (data) => {
      originalHooks.onProgress(data);
      if (data.prompt_id === promptId) {
        const percent = Math.round((data.value / data.max) * 100);
        console.error(`[进度更新] ${data.value}/${data.max} (${percent}%)`);
        reportProgress({
          stage: "progress",
          message: `节点 ${data.node} 执行中: ${data.value}/${data.max}`,
          percent,
          nodeId: data.node,
          current: data.value,
          max: data.max,
        });
      }
    };

    client.hook.onExecuted = (data) => {
      console.error(`[onExecuted] 收到消息:`, data);
      originalHooks.onExecuted(data);
      if (data.prompt_id === promptId) {
        console.error(`[节点完成] Node: ${data.node}`);
        // 收集输出
        if (data.output) {
          outputs[data.node] = data.output;
        }
      } else {
        console.error(
          `[节点完成] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onExecutionSuccess = (data) => {
      console.error(`[onExecutionSuccess] 收到消息:`, data);
      originalHooks.onExecutionSuccess(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行成功] Prompt ID: ${promptId}`);
        reportProgress({
          stage: "completed",
          message: "工作流执行完成",
          percent: 100,
        });
        resolve({
          success: true,
          promptId,
          outputs,
          executionTime: Date.now() - startTime,
        });
      } else if (data.prompt_id !== promptId) {
        console.error(
          `[执行成功] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onExecutionError = (data) => {
      console.error(`[onExecutionError] 收到消息:`, data);
      originalHooks.onExecutionError(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行错误] Prompt ID: ${promptId}`, data);
        const errorMsg =
          data.exception_message || data.error || JSON.stringify(data);
        reportProgress({
          stage: "error",
          message: `执行出错: ${errorMsg}`,
        });
        resolve({
          success: false,
          promptId,
          error: errorMsg,
          executionTime: Date.now() - startTime,
        });
      } else if (data.prompt_id !== promptId) {
        console.error(
          `[执行错误] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };

    client.hook.onExecutionInterrupted = (data) => {
      console.error(`[onExecutionInterrupted] 收到消息:`, data);
      originalHooks.onExecutionInterrupted(data);
      if (data.prompt_id === promptId && !isCompleted) {
        isCompleted = true;
        cleanup();
        console.error(`[执行中断] Prompt ID: ${promptId}`);
        resolve({
          success: false,
          promptId,
          error: "工作流执行被中断",
          executionTime: Date.now() - startTime,
        });
      } else if (data.prompt_id !== promptId) {
        console.error(
          `[执行中断] prompt_id 不匹配: 收到 ${data.prompt_id}, 期望 ${promptId}`,
        );
      }
    };
  });
}
