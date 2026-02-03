import axios from "axios";
import {
  ComfyPromptConfig,
  ComfyTaskResponse,
  PromptType,
} from "../interface/task";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";

export interface FetchTasksOptions {
  baseUrl: string;
  maxItems?: number;
  offset?: number;
}

export interface FetchTaskOptions {
  baseUrl: string;
  promptId: string;
}

/**
 * @METHOD
 * @description 获取历史任务（支持分页）
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchHistoryTasks(
  options: FetchTasksOptions,
): Promise<ComfyTaskResponse> {
  const { baseUrl, maxItems = 3, offset = 0 } = options;

  const url = `${baseUrl}/history?max_items=${maxItems}&offset=${offset}`;

  const res = await axios.get<ComfyTaskResponse>(url);

  if (typeof res.data !== "object" || res.data === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid history tasks response",
    );
  }

  const successTasks = Object.fromEntries(
    Object.entries(res.data).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  return successTasks;
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
