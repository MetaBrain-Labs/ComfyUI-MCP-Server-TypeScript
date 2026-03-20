import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { api } from "../../api/api";
import {
  ComfyNodeOutput,
  ComfyPromptConfig,
  ComfyTaskItem,
  ComfyTaskResponse,
} from "../../types/task";

export interface FetchTasksOptions {
  maxItems?: number;
  offset?: number;
}

export interface FetchTaskOptions {
  promptId: string;
}

/**
 * 获取历史任务（支持分页）
 */
export async function fetchHistoryTasks(
  options: FetchTasksOptions,
): Promise<{ successTasks: ComfyTaskResponse; total: number; fail: number }> {
  const { maxItems, offset } = options;
  const res = await api.pageHistoryTasks(maxItems, offset);
  const total = Object.entries(res).length;

  const successTasks = Object.fromEntries(
    Object.entries(res).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  const fail = total - Object.entries(successTasks).length;
  return { successTasks, total, fail };
}

/**
 * 获取指定promptIds对应的历史任务信息
 */
export async function fetchUserWorkflow(
  availableWorkflow: string[],
): Promise<ComfyTaskResponse> {
  let historyTasks: [string, ComfyTaskItem][] = [];

  for (const promptId of availableWorkflow) {
    const res = await api.getDetailHistoryTasks(promptId);
    historyTasks = historyTasks.concat(Object.entries(res));
  }

  const successTasks = Object.fromEntries(historyTasks) as ComfyTaskResponse;

  if (successTasks === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid detail tasks response",
    );
  }

  return successTasks;
}

/**
 * 根据 promptId 获取任务详情
 */
export async function fetchTaskByPromptId(
  options: FetchTaskOptions,
): Promise<ComfyPromptConfig> {
  const { promptId } = options;
  const res = await api.getDetailHistoryTasks(promptId);

  const successTasks = Object.fromEntries(
    Object.entries(res).filter(([uuid, item]) => {
      if (item.status.status_str === "success") {
        return true;
      } else {
        const isExecutionInterrupted = item.status.messages.filter((item) => {
          return item[0] === "execution_interrupted";
        });
        return isExecutionInterrupted.length > 0;
      }
    }),
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
 * 获取成功历史任务的资产信息
 */
export async function fetchAssetsByPromptId(
  promptId: string,
): Promise<ComfyNodeOutput[]> {
  const res = await api.getDetailHistoryTasks(promptId);

  const successTasks = Object.fromEntries(
    Object.entries(res).filter(([uuid, item]) => {
      if (item.status.status_str === "success") {
        return true;
      } else {
        const isExecutionInterrupted = item.status.messages.filter((item) => {
          return item[0] === "execution_interrupted";
        });
        return isExecutionInterrupted.length > 0;
      }
    }),
  ) as ComfyTaskResponse;

  if (successTasks === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid detail tasks response",
    );
  }

  const outputs = Object.values(successTasks)[0].outputs;

  if (Object.keys(outputs).length === 0) {
    throw new McpError(ErrorCode.InternalError, "Invalid outputs response");
  }

  return Object.values(outputs);
}
